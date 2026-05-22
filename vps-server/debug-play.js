import axios from 'axios';

const MOVIEBOX_API_BASE = 'https://h5.aoneroom.com';
const MOVIEBOX_BFF_BASE = 'https://h5.aoneroom.com/wefeed-h5-bff';

const movieboxClient = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'moviebox-js-sdk/preview',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.5',
    'X-Client-Info': '{"timezone":"Africa/Nairobi"}',
    'Content-Type': 'application/json'
  }
});

async function getGuestCookie() {
  console.log('[COOKIE] Fetching new guest session...');
  const response = await movieboxClient.get(
    `${MOVIEBOX_API_BASE}/wefeed-h5-bff/app/get-latest-app-pkgs`,
    {
      params: { app_name: 'moviebox' }
    }
  );

  const cookies = response.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    throw new Error('No cookies received from Moviebox API');
  }

  const sessionCookie = cookies
    .map(c => c.split(';')[0])
    .join('; ');

  console.log('[COOKIE] Session established:', sessionCookie);
  return sessionCookie;
}

async function debugPlay() {
  try {
    const cookie = await getGuestCookie();
    
    // Test with Avatar: The Way of Water
    const subjectId = '5583598183634063680';
    const detailPath = 'avatar-the-way-of-water-U0sNCcdWsE6';
    const refererUrl = `${MOVIEBOX_API_BASE}/movies/${detailPath}`;
    
    console.log(`[PLAY] Requesting play data for subjectId: ${subjectId}`);
    const playResponse = await movieboxClient.get(
      `${MOVIEBOX_BFF_BASE}/web/subject/play`,
      {
        params: {
          subjectId: subjectId,
          se: 0,
          ep: 0
        },
        headers: {
          'Cookie': cookie,
          'Referer': refererUrl
        }
      }
    );
    
    console.log('[PLAY] Status Code:', playResponse.status);
    console.log('[PLAY] Response Data:', JSON.stringify(playResponse.data, null, 2));

    console.log(`[DOWNLOAD] Requesting download data for subjectId: ${subjectId}`);
    const downloadResponse = await movieboxClient.get(
      `${MOVIEBOX_BFF_BASE}/web/subject/download`,
      {
        params: {
          subjectId: subjectId,
          se: 0,
          ep: 0
        },
        headers: {
          'Cookie': cookie,
          'Referer': refererUrl
        }
      }
    );

    console.log('[DOWNLOAD] Status Code:', downloadResponse.status);
    console.log('[DOWNLOAD] Response Data:', JSON.stringify(downloadResponse.data, null, 2));
  } catch (error) {
    console.error('[ERROR]', error.message);
    if (error.response) {
      console.error('[ERROR] Response:', error.response.status, JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugPlay();
