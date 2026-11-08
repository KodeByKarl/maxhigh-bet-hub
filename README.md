# MaxHigh

Casino and betting dashboard template — slots, originals, races, promotions, and VIP.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Development startup checks the database before opening the app. For the configured local demo it also starts Docker Desktop and waits for MariaDB to be healthy. See [local demo setup and accounts](docs/local-demo-database.md).

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
