// Browser notification helper for VEKTORA price alerts

export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isNotificationSupported()) return 'denied';
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Notification.permission;
    }
    try {
        return await Notification.requestPermission();
    } catch {
        return 'denied';
    }
}

interface NotifyOptions {
    title: string;
    body: string;
    tag?: string; // Used to deduplicate notifications
}

export function sendNotification({ title, body, tag }: NotifyOptions): void {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;
    try {
        new Notification(title, {
            body,
            tag,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
        });
    } catch (e) {
        console.error('Failed to send notification:', e);
    }
}
