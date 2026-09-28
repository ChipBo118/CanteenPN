'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock3, LogIn, LogOut, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { apiRequest, authHeaders, formatDateTime } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Shift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  location?: string;
  attendance?: {
    clockInAt?: string;
    clockOutAt?: string;
    status: string;
  };
};

const dateKey = (value: string | Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value));

const timeOnly = (value?: string) => value
  ? new Date(value).toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
    })
  : '—';

const shiftTime = (shift: Shift, field: 'startTime' | 'endTime') =>
  new Date(`${dateKey(shift.date)}T${shift[field]}:00+07:00`);

export function StaffSelfService({ mode }: { mode: 'shifts' | 'attendance' | 'combined' }) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [now, setNow] = useState<Date | null>(null);
  const shifts = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => apiRequest<Shift[]>('/shifts/mine', { headers: authHeaders(token) }),
    enabled: !!token,
  });
  const attendance = useMutation({
    mutationFn: (kind: 'clock-in' | 'clock-out') => apiRequest(`/attendance/${kind}`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-shifts'] }),
  });

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayShifts = useMemo(() => {
    if (!now) return [];
    const today = dateKey(now);
    return (shifts.data ?? []).filter((shift) => dateKey(shift.date) === today && shift.status !== 'CANCELLED');
  }, [now, shifts.data]);

  const currentShift = todayShifts.find((shift) => shift.attendance?.clockInAt && !shift.attendance.clockOutAt)
    ?? todayShifts.find((shift) => shift.status === 'SCHEDULED')
    ?? todayShifts[0];

  const nextShift = useMemo(() => {
    if (!now) return undefined;
    return (shifts.data ?? [])
      .filter((shift) => shift.status === 'SCHEDULED' && shiftTime(shift, 'endTime') >= now)
      .sort((left, right) => shiftTime(left, 'startTime').getTime() - shiftTime(right, 'startTime').getTime())[0];
  }, [now, shifts.data]);

  if (shifts.isLoading) return <LoadingState />;

  const showAttendance = mode !== 'shifts';
  const showShifts = mode !== 'attendance';
  const canClockIn = currentShift?.status === 'SCHEDULED' && !currentShift.attendance?.clockInAt;
  const canClockOut = !!currentShift?.attendance?.clockInAt && !currentShift.attendance.clockOutAt;
  const attendanceHint = !currentShift
    ? 'Hôm nay bạn chưa có ca được phân.'
    : currentShift.attendance?.clockOutAt
      ? 'Ca hôm nay đã hoàn tất.'
      : currentShift.attendance?.clockInAt
        ? 'Bạn đã vào ca. Hãy chấm tan ca khi kết thúc công việc.'
        : currentShift.status === 'SCHEDULED'
          ? 'Ca hôm nay đã sẵn sàng để chấm công.'
          : 'Ca hôm nay không ở trạng thái có thể chấm công.';
  const presentCount = (shifts.data ?? []).filter((shift) => shift.attendance?.status === 'PRESENT').length;
  const lateCount = (shifts.data ?? []).filter((shift) => shift.attendance?.status === 'LATE').length;

  return (
    <div className="space-y-8">
      {showAttendance && (
        <section className="surface overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-2">
            <div className="border-b p-7 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-brand-600">
                <Clock3 size={18} /> Giờ hiện tại
              </div>
              <p className="mt-5 text-5xl font-black tabular-nums tracking-[-.05em] sm:text-6xl">
                {now ? now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '--:--:--'}
              </p>
              <p className="mt-3 capitalize text-[color:var(--muted)]">
                {now ? now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Đang tải ngày hiện tại…'}
              </p>
              <div className="mt-7 rounded-2xl bg-brand-50 p-4 dark:bg-brand-900/30">
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-700 dark:text-brand-100">Ca tiếp theo</p>
                {nextShift ? (
                  <>
                    <p className="mt-2 text-lg font-black">{nextShift.startTime} – {nextShift.endTime}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{formatDateTime(nextShift.date).split(' ')[0]} · {nextShift.location ?? 'Căng tin trung tâm'}</p>
                  </>
                ) : <p className="mt-2 text-sm text-[color:var(--muted)]">Chưa có ca sắp tới.</p>}
              </div>
            </div>

            <div className="p-7">
              <p className="eyebrow">Hôm nay</p>
              <h2 className="mt-2 text-3xl font-black">Chấm công ca hiện tại</h2>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border p-4"><span className="block text-[color:var(--muted)]">Vào ca</span><strong className="mt-1 block text-lg">{timeOnly(currentShift?.attendance?.clockInAt)}</strong></div>
                <div className="rounded-2xl border p-4"><span className="block text-[color:var(--muted)]">Tan ca</span><strong className="mt-1 block text-lg">{timeOnly(currentShift?.attendance?.clockOutAt)}</strong></div>
                <div className="col-span-2 flex items-center justify-between rounded-2xl border p-4">
                  <div><span className="block text-[color:var(--muted)]">Ca làm</span><strong className="mt-1 block">{currentShift ? `${currentShift.startTime} – ${currentShift.endTime}` : '—'}</strong></div>
                  {currentShift && <StatusBadge value={currentShift.attendance?.status ?? currentShift.status} />}
                </div>
              </div>
              <p className="mt-4 text-sm text-[color:var(--muted)]">{attendanceHint}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button onClick={() => attendance.mutate('clock-in')} disabled={!canClockIn || attendance.isPending} className="button-primary disabled:cursor-not-allowed disabled:opacity-50">
                  <LogIn size={18} /> {currentShift?.attendance?.clockInAt ? 'Đã vào ca' : 'Vào ca'}
                </button>
                <button onClick={() => attendance.mutate('clock-out')} disabled={!canClockOut || attendance.isPending} className="button-secondary disabled:cursor-not-allowed disabled:opacity-50">
                  <LogOut size={18} /> {currentShift?.attendance?.clockOutAt ? 'Đã tan ca' : 'Tan ca'}
                </button>
              </div>
              {attendance.isSuccess && <p className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">Đã ghi nhận thành công.</p>}
              {attendance.isError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{(attendance.error as Error).message}</p>}
            </div>
          </div>
        </section>
      )}

      {showShifts && (
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface rounded-2xl p-4"><span className="text-xs text-[color:var(--muted)]">Tổng ca</span><strong className="mt-1 block text-2xl">{shifts.data?.length ?? 0}</strong></div>
            <div className="surface rounded-2xl p-4"><span className="text-xs text-[color:var(--muted)]">Đúng giờ</span><strong className="mt-1 block text-2xl text-brand-600">{presentCount}</strong></div>
            <div className="surface rounded-2xl p-4"><span className="text-xs text-[color:var(--muted)]">Đi muộn</span><strong className="mt-1 block text-2xl text-amber-600">{lateCount}</strong></div>
          </div>
          <div>
            <p className="eyebrow">Lịch cá nhân</p>
            <h2 className="mt-2 text-3xl font-black">Ca làm của tôi</h2>
          </div>
          {shifts.data?.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {shifts.data.map((shift) => (
                <article key={shift.id} className="surface rounded-3xl p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm text-[color:var(--muted)]"><CalendarDays size={15} />{formatDateTime(shift.date).split(' ')[0]}</p>
                      <p className="mt-2 text-2xl font-black">{shift.startTime} – {shift.endTime}</p>
                    </div>
                    <StatusBadge value={shift.attendance?.status ?? shift.status} />
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-sm"><MapPin size={15} />{shift.location ?? 'Căng tin trung tâm'}</p>
                  <p className="mt-3 text-xs text-[color:var(--muted)]">
                    Vào ca: {timeOnly(shift.attendance?.clockInAt)} · Tan ca: {timeOnly(shift.attendance?.clockOutAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : <EmptyState title="Chưa có ca được phân" />}
        </section>
      )}
    </div>
  );
}
