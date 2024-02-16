import { notificationManagementCommands } from '@app/tcp/notificationMessagePatterns/notification.management.message.patterns';

/**
 * Sends a notification with dynamic arguments and allows passing a notification client.
 *
 * @param notificationClient The notification client instance to use for sending the notification.
 * @param args The arguments for the notification.
 */
export async function sendNotification(
  notificationClient: any,
  args: {
    userId: string;
    nameOfTheService: string;
    text: string;
    initials: string;
  },
): Promise<void> {
  try {
    await notificationClient
      .send(
        { cmd: notificationManagementCommands.createNotification.cmd },
        args,
      )
      .toPromise();
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification', error);
  }
}
