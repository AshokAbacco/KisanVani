import { useEffect, useState } from 'react';
import { chatApi } from '../services';
import { getSocket } from '../services/socket';

/** Total unread chat messages for the signed-in user, kept live by the server's `chat:unread` event. */
const useChatUnread = () => {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      chatApi
        .unreadCount()
        .then((r) => alive && setTotal(r.total))
        .catch(() => {});
    load();
    const s = getSocket();
    const onUnread = (r) => setTotal(r.total);
    s.on('chat:unread', onUnread);
    s.on('connect', load); // catch up after a reconnect
    return () => {
      alive = false;
      s.off('chat:unread', onUnread);
      s.off('connect', load);
    };
  }, []);
  return total;
};

export default useChatUnread;