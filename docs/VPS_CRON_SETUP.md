# Setting up Automated Reminders on VPS

To run the invoice reminders automatically every day, you need to set up a cron job on your VPS.

## 1. Get your CRON_SECRET
Ensure you have a `CRON_SECRET` defined in your `.env` file on the server.
Example: `CRON_SECRET="my_secure_random_string_123"`

## 2. Edit Crontab
Log in to your VPS terminal and run:

```bash
crontab -e
```

## 3. Add the Job
Add the following line to the bottom of the file to run the reminder script every day at 9:00 AM (server time):

```cron
0 9 * * * curl -X POST http://localhost:3000/api/reminders/process -H "Authorization: Bearer <YOUR_CRON_SECRET>" >> /var/log/invofox_cron.log 2>&1
```

**Replace `<YOUR_CRON_SECRET>` with the actual secret from your `.env` file.**

## 4. Verify
Propagate the changes and restart cron if necessary (usually automatic).
You can check the log file `/var/log/invofox_cron.log` to see the output of the job.
