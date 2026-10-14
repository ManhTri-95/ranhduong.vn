import { describe, expect, it } from 'vitest';
import { createConfirmQueue } from './confirm';

const REQUEST = { title: 'Bỏ thay đổi Giả Lập?', body: 'Nội dung giả lập.', confirmLabel: 'Bỏ' };

describe('createConfirmQueue', () => {
  it('trả đúng câu trả lời rồi đóng hộp khi hết hàng', async () => {
    const queue = createConfirmQueue();
    const answer = queue.ask(REQUEST);
    expect(queue.current.value?.title).toBe('Bỏ thay đổi Giả Lập?');
    queue.answer(true);
    await expect(answer).resolves.toBe(true);
    expect(queue.current.value).toBeNull();
  });
  it('hỏi thêm khi đang có hộp thì chờ tới lượt, mỗi lời hỏi nhận đúng một câu trả lời', async () => {
    const queue = createConfirmQueue();
    const first = queue.ask({ ...REQUEST, title: 'Thứ nhất' });
    const second = queue.ask({ ...REQUEST, title: 'Thứ hai' });
    expect(queue.current.value?.title).toBe('Thứ nhất');
    queue.answer(false);
    expect(queue.current.value?.title).toBe('Thứ hai');
    queue.answer(true);
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    queue.answer(true);
    expect(queue.current.value).toBeNull();
  });
});
