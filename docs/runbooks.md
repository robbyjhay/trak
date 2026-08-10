# Trak Runbooks

## Deployment
1. Set environment variables based on `.env.example`.
2. Run `npm ci`.
3. Run `npm run db:migrate:deploy` to apply migrations.
4. Run `npm run build`.
5. Run `npm start`.

## Backups & Restore
- **Backup**: Run `npm run db:backup` or `./scripts/backup.sh`.
- **Restore**: Run `npm run db:restore <backup_file>` or `./scripts/restore.sh <backup_file>`.

## Load Testing
- Run `k6 run scripts/load-test.js` to perform a basic load test. Override the URL with `k6 run -e BASE_URL=https://staging.trak.com scripts/load-test.js`.
