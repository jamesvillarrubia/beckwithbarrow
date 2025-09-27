export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'https://striking-ball-b079f8c4b0.strapiapp.com'),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
