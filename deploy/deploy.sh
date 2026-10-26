#!/usr/bin/env bash
# oracle_vm 에서 실행된다. origin/main 을 빌드해 ~/triplan/app 과 교체하고,
# /api/health 가 실패하면 직전 빌드로 되돌린다.
# GitHub Actions 가 SSH 로 호출한다 (authorized_keys 의 command= 로 이 스크립트만 실행 가능).
#
# 서버 배치:
#   ~/triplan/src   git clone (이 저장소)
#   ~/triplan/app   실행 중인 standalone 빌드 (systemd triplan.service)
#   ~/triplan/.env  비밀값 (저장소에 없음)
set -euo pipefail

ROOT=/home/ubuntu/triplan
PORT=8030
cd "$ROOT/src"

git fetch --quiet origin main
git reset --hard --quiet origin/main
echo "building $(git rev-parse --short HEAD)"

npm ci --no-audit --no-fund
# NEXT_PUBLIC_* 는 빌드 시점에 박히므로 .env 를 읽고 빌드한다
set -a; . "$ROOT/.env"; set +a
npm run build

rm -rf "$ROOT/app.new"
cp -r .next/standalone "$ROOT/app.new"
cp -r public "$ROOT/app.new/"
cp -r .next/static "$ROOT/app.new/.next/"

rm -rf "$ROOT/app.prev"
[ -d "$ROOT/app" ] && mv "$ROOT/app" "$ROOT/app.prev"
mv "$ROOT/app.new" "$ROOT/app"
sudo systemctl restart triplan

for _ in $(seq 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/api/health"; then
    echo "deployed $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 1
done

echo "health check failed, rolling back" >&2
if [ -d "$ROOT/app.prev" ]; then
  rm -rf "$ROOT/app.failed"
  mv "$ROOT/app" "$ROOT/app.failed"
  mv "$ROOT/app.prev" "$ROOT/app"
  sudo systemctl restart triplan
fi
exit 1
