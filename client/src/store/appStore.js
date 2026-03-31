import { create } from 'zustand'

export const useAppStore = create((set) => ({
  application: null,
  notifications: [],
  unreadCount: 0,

  setApplication: (application) => set({ application }),
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length
    set({ notifications, unreadCount })
  },
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}))
