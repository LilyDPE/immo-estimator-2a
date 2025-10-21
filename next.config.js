/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api-adresse.data.gouv.fr'],
  },
  env: {
    AGENCY_NAME: '2A immo',
    AGENCY_PHONE: '0686386259',
    AGENCY_EMAIL: 'contact@2a-immobilier.com',
    AGENCY_COLOR_PRIMARY: '#04264b',
    AGENCY_COLOR_SECONDARY: '#95c122',
    AGENCY_COLOR_GRAY: '#c7c7c7',
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
