[private]
just:
    just -l

[group('test')]
test:
    npm run test

[group('manage')]
reinstall:
    rm -rf node_modules package-lock.json
    npm install

[group('manage')]
outdated:
    npm outdated --omit=dev

[group('manage')]
update-dev:
    npx npm-check-updates -u --dep dev --target minor

[group('manage')]
update-prod:
    npx npm-check-updates -u --dep prod --target minor

[group('manage')]
check:
    npx eslint . --ext .ts

[group('build')]
clean:
    rm -rf dist

[group('build')]
build:
    npm run build

# Rebuild
[group('build')]
rb:
    just clean & just build

[group('run')]
ct: build
    npm start -- --create-token

[group('run')]
ctd: build
    npm start -- --create-token --dry-run

[group('run')]
cs: build
    npm start -- --create-series

[group('run')]
csd: build
    npm start -- --create-series --dry-run

[group('run')]
mn: build
    npm start -- --mint-nft

[group('run')]
mnd: build
    npm start -- --mint-nft --dry-run
