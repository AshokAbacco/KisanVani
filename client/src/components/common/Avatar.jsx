import { initials } from '../../utils/format';

const Avatar = ({ name, src, size = 'h-9 w-9' }) =>
  src ? (
    <img src={src} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} accent-soft accent-text grid shrink-0 place-items-center rounded-full text-sm font-semibold`} aria-hidden>
      {initials(name)}
    </span>
  );

export default Avatar;
