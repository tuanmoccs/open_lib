#!/usr/bin/env bash
# Dump the MySQL database to backups/ and keep the last 7 dumps.
# Example cron (daily at 03:00): 0 3 * * * /opt/reading-tracker/scripts/backup-db.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="backups/reading_tracker_${timestamp}.sql.gz"

# Credentials are read inside the container from its own environment, never from the command line.
docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u"$MYSQL_USER" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' \
  | gzip > "$target"

ls -1t backups/reading_tracker_*.sql.gz | tail -n +8 | xargs -r rm --
echo "Backup written to $target"
