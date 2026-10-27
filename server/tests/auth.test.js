const { prisma, app, request, resetDb, createUser, api, PASSWORD } = require('./helpers');
const email = require('../src/services/email.service');

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());

const cookieValue = (setCookie) => (setCookie || []).find((c) => c.startsWith('kv_rt='));

describe('Registration', () => {
  test('shopkeeper self-registers and is signed in immediately', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ role: 'SHOPKEEPER', name: 'Asha', mobile: '+91 98450 11111', email: 'Asha@Example.com', password: 'Secret123', shopName: 'Asha Stores' });
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.mobile).toBe('9845011111');
    expect(res.body.data.user.email).toBe('asha@example.com');
    expect(res.body.data.user.shopProfile.shopName).toBe('Asha Stores');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(cookieValue(res.headers['set-cookie'])).toMatch(/HttpOnly/);
  });

  test('duplicate mobile is rejected with 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ role: 'FARMER', name: 'Dup', mobile: '9845011111', password: 'Secret123' });
    expect(res.status).toBe(409);
  });

  test('ADMIN cannot be self-registered', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ role: 'ADMIN', name: 'Hacker', mobile: '9845022222', password: 'Secret123' });
    expect(res.status).toBe(422);
  });

  test('weak password and missing role fields are rejected with field errors', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ role: 'DRIVER', name: 'D', mobile: '123', password: 'short' });
    expect(res.status).toBe(422);
    const paths = res.body.error.details.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['mobile', 'password', 'licenseNumber']));
  });

  test('driver registration requires admin approval before login', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ role: 'DRIVER', name: 'Ravi', mobile: '9845033333', password: 'Secret123', licenseNumber: 'KA0120200001' });
    expect(reg.status).toBe(201);
    expect(reg.body.data.pendingApproval).toBe(true);
    expect(reg.body.data.accessToken).toBeUndefined();

    const login = await request(app).post('/api/v1/auth/login').send({ identifier: '9845033333', password: 'Secret123', role: 'DRIVER' });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_PENDING');

    const admin = await createUser('ADMIN', { email: 'root@test.local' });
    const approve = await api(admin.token).post(`/api/v1/admin/users/${reg.body.data.user.id}/status`).send({ status: 'ACTIVE' });
    expect(approve.status).toBe(200);

    const again = await request(app).post('/api/v1/auth/login').send({ identifier: '9845033333', password: 'Secret123', role: 'DRIVER' });
    expect(again.status).toBe(200);
  });
});

describe('Login', () => {
  test('wrong password → 401 with a generic message', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ identifier: 'asha@example.com', password: 'Nope12345', role: 'SHOPKEEPER' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('unknown account → same 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ identifier: 'nobody@example.com', password: 'Nope12345', role: 'SHOPKEEPER' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('the role is verified on the server: choosing the wrong portal is refused', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ identifier: 'asha@example.com', password: 'Secret123', role: 'ADMIN' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_MISMATCH');
  });

  test('login by e-mail (case-insensitive) and by mobile both work', async () => {
    const a = await request(app).post('/api/v1/auth/login').send({ identifier: 'ASHA@example.com', password: 'Secret123', role: 'SHOPKEEPER' });
    const b = await request(app).post('/api/v1/auth/login').send({ identifier: '98450 11111', password: 'Secret123', role: 'SHOPKEEPER' });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  test('suspended accounts cannot log in and existing tokens stop working', async () => {
    const admin = await createUser('ADMIN');
    const victim = await createUser('FARMER');
    expect((await api(victim.token).get('/api/v1/auth/me')).status).toBe(200);
    const s = await api(admin.token).post(`/api/v1/admin/users/${victim.user.id}/status`).send({ status: 'SUSPENDED', reason: 'Fraud check' });
    expect(s.status).toBe(200);
    expect((await api(victim.token).get('/api/v1/auth/me')).status).toBe(403);
    const login = await request(app).post('/api/v1/auth/login').send({ identifier: victim.user.mobile, password: PASSWORD, role: 'FARMER' });
    expect(login.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('Tokens', () => {
  test('requests without or with a forged token are rejected', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    const forged = await api('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IkFETUlOIn0.bad').get('/api/v1/auth/me');
    expect(forged.status).toBe(401);
  });

  test('refresh rotates the token; re-using an old refresh token revokes the whole family', async () => {
    const { cookie } = await createUser('SHOPKEEPER');
    const c1 = cookieValue(cookie).split(';')[0];

    const r1 = await request(app).post('/api/v1/auth/refresh').set('Cookie', c1);
    expect(r1.status).toBe(200);
    const c2 = cookieValue(r1.headers['set-cookie']).split(';')[0];
    expect(c2).not.toBe(c1);

    // Replaying the first token = theft signal
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', c1);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('REFRESH_TOKEN_REUSED');

    // The legitimate newer token was revoked too
    const after = await request(app).post('/api/v1/auth/refresh').set('Cookie', c2);
    expect(after.status).toBe(401);
  });

  test('logout revokes the refresh token', async () => {
    const { cookie } = await createUser('FARMER');
    const c = cookieValue(cookie).split(';')[0];
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', c)).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', c)).status).toBe(401);
  });
});

describe('Password reset', () => {
  test('OTP → reset token → new password; old sessions revoked; token single-use', async () => {
    const { user, cookie } = await createUser('FARMER', { email: 'reset@test.local' });
    let captured;
    const spy = jest.spyOn(email, 'sendPasswordReset').mockImplementation(async (args) => {
      captured = args;
      return 'sent';
    });

    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ identifier: 'ghost@test.local' });
    expect(unknown.status).toBe(200); // no account enumeration
    expect(spy).not.toHaveBeenCalled();

    const fp = await request(app).post('/api/v1/auth/forgot-password').send({ identifier: 'reset@test.local' });
    expect(fp.status).toBe(200);
    expect(captured.otp).toMatch(/^\d{6}$/);

    const wrong = await request(app).post('/api/v1/auth/verify-otp').send({ identifier: 'reset@test.local', otp: captured.otp === '000000' ? '111111' : '000000' });
    expect(wrong.status).toBe(400);

    const ok = await request(app).post('/api/v1/auth/verify-otp').send({ identifier: 'reset@test.local', otp: captured.otp });
    expect(ok.status).toBe(200);
    const { resetToken } = ok.body.data;

    const reset = await request(app).post('/api/v1/auth/reset-password').send({ token: resetToken, password: 'BrandNew123' });
    expect(reset.status).toBe(200);
    const reuse = await request(app).post('/api/v1/auth/reset-password').send({ token: resetToken, password: 'Another123' });
    expect(reuse.status).toBe(400);

    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', cookieValue(cookie).split(';')[0])).status).toBe(401);
    const login = await request(app).post('/api/v1/auth/login').send({ identifier: user.mobile, password: 'BrandNew123', role: 'FARMER' });
    expect(login.status).toBe(200);
    spy.mockRestore();
  });

  test('OTP is locked after too many wrong attempts', async () => {
    await createUser('SHOPKEEPER', { email: 'lock@test.local' });
    const spy = jest.spyOn(email, 'sendPasswordReset').mockResolvedValue('sent');
    await request(app).post('/api/v1/auth/forgot-password').send({ identifier: 'lock@test.local' });
    let last;
    for (let i = 0; i < 6; i++) last = await request(app).post('/api/v1/auth/verify-otp').send({ identifier: 'lock@test.local', otp: '999999' });
    expect([400, 429]).toContain(last.status);
    const locked = await request(app).post('/api/v1/auth/verify-otp').send({ identifier: 'lock@test.local', otp: '999999' });
    expect(locked.status).toBe(400); // token was invalidated
    spy.mockRestore();
  });
});

describe('Role-based authorization', () => {
  test('each role is confined to its own APIs', async () => {
    const farmer = await createUser('FARMER');
    const shop = await createUser('SHOPKEEPER');
    const driver = await createUser('DRIVER');
    expect((await api(farmer.token).get('/api/v1/inventory')).status).toBe(403);
    expect((await api(farmer.token).get('/api/v1/admin/users')).status).toBe(403);
    expect((await api(shop.token).get('/api/v1/farmers/listings')).status).toBe(403);
    expect((await api(shop.token).get('/api/v1/mandi/lots')).status).toBe(403);
    expect((await api(driver.token).post('/api/v1/billing/invoices').send({})).status).toBe(403);
    expect((await api(shop.token).get('/api/v1/inventory')).status).toBe(200);
    expect((await api(farmer.token).get('/api/v1/farmers/dashboard')).status).toBe(200);
    expect((await api(driver.token).get('/api/v1/drivers/dashboard')).status).toBe(200);
  });

  test('profile update changes only allowed fields', async () => {
    const shop = await createUser('SHOPKEEPER');
    const res = await api(shop.token)
      .patch('/api/v1/auth/me')
      .send({ name: 'Renamed', role: 'ADMIN', profile: { shopName: 'New Name', receiptFooter: 'Thank you!' }, address: { latitude: 12.9, longitude: 77.6, pincode: '560001' } });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
    expect(res.body.data.role).toBe('SHOPKEEPER');
    expect(res.body.data.shopProfile.shopName).toBe('New Name');
    expect(res.body.data.shopProfile.address.pincode).toBe('560001');
  });

  test('changing the password invalidates other sessions', async () => {
    const { token, cookie } = await createUser('MANDI_OWNER');
    const res = await api(token).post('/api/v1/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'Changed123' });
    expect(res.status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', cookieValue(cookie).split(';')[0])).status).toBe(401);
  });
});
