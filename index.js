const ROUTE = '/xyzabcd1234';
const PATH_FOR_SCRIPT_DOWNLOAD = '/ghjklmno56789';
const PATH_FOR_GET_ENDPOINT = '/qwerty13579';
const BROWSER_TOKEN = 'ztukooZ3oRmG8FgOXMva';

function createCookieStringFromObject(name, value) {
  const filtered = Object.entries(value).filter(([k]) => k !== 'name' && k !== 'value');
  const nameValue = `${name}=${value.value}`;
  const rest = filtered.map(([k,v]) => `${k}=${v}`);
  return [nameValue, ...rest].join('; ');
}

function createResponse(request, response) {
  console.log({setCookie: response.headers.get('set-cookie')})
  const origin = request.headers.get('origin')
  const domain = 'necipallef.com'// psl.get((new URL(origin)).hostname) || undefined
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  })
  // Fixme parse function for multiple set-cookie. Try getAll. Check here https://developers.cloudflare.com/workers/runtime-apis/headers#differences
  // const cookies = parse(response, { map: true })
  // newResponse.headers.delete('set-cookie')
  // for (const [name, value] of Object.entries(cookies)) {
  //   value.domain = domain
  //   const cookiesValue = createCookieStringFromObject(name, value)
  //   newResponse.headers.append('set-cookie', cookiesValue)
  // }

  return newResponse
}

async function handleRequestRaw(event, endpoint) {
  if (event == null) {
    throw new Error('event is null');
  }

  if (event.request == null) {
    throw new Error('request is null');
  }

  if (endpoint == null) {
    throw new Error('endpoint is null');
  }

  const newRequest = new Request(endpoint, new Request(event.request))

  const response = await fetch(newRequest)
  return createResponse(event.request, response)
}

function createErrorResponse(reason) {
  const responseBody = {
    message: 'An error occurred with Cloudflare worker.',
    reason,
  }
  return new Response(JSON.stringify(responseBody), { status: 500 })
}

async function fetchCacheable(event, request) {
  return fetch(request, {cf: {cacheTtl: 5 * 60}});
  const cacheURL = new URL(request.url);

  const cacheKey = new Request(cacheURL.toString(), request);
  const cache = caches.default;

  let response = await cache.match(cacheKey)
  if (!response) {
    console.log(`Response for request url: ${request.url} not present in cache. Fetching and caching request.`);
    response = await fetch(request)
    response = new Response(response.body, response)
    console.log(`cache control header before: ${response.headers.get('cache-control')}`)
    response.headers.append('Cache-Control', 's-maxage=10')
    console.log(`cache control header after: ${response.headers.get('cache-control')}`)
    event.waitUntil(cache.put(cacheKey, response.clone()))
  } else {
    console.log(`Cache hit for: ${request.url}`)
  }

  return response
}

async function handleDownloadScript(event){
  // const url = `https://fpcdn.io/v3/${BROWSER_TOKEN}`;
  // const url = `https://fpcdn.io`;
  // const url = `https://fingerprintjs.com`;
  // const url = `https://fpjs-api.necipallef.com/cache-test.js`;
  // const url = `http://fpjs-api.necipallef.com/cache-test.js`;
  const url = `http://necipallef.xyz/cache-test.js`;
  // const url = `http://necipallef.xyz/noExtension`;
  // const url = `http://necipallef.xyz/get-worker-header`;
  // const url = `https://api.fpjs.pro/subscriptions`;
  // const url = `https://musterix.bantastr.com/api/companies/1`;
  const newRequest = new Request(url, new Request(event.request, {
    headers: new Headers(event.request.headers)
  }))
  for (const [key, value] of Object.entries(newRequest.headers)) {
    if (key === 'x-forwarded-for' || key === 'cf-connecting-ip') {
      console.log(`${key}:${value}`)
    }
  }
  // return fetch(`https://fpcdn.io/v3/${BROWSER_TOKEN}`)
  // return fetch(newRequest)
  // return fetch(url)
  // return fetch(newRequest, {cf: {cacheTtl: 3 * 60 * 60}})
  return fetchCacheable(event, newRequest)
    .then(res => {
      console.log('PRINTING RES HEADERS BEGIN')
      let message = '';
      for (const [key, value] of res.headers) {
        message += `${key}:${value}    `
        // console.log({key, value});
      }
      console.log(message)
      console.log('PRINTING RES HEADERS END')

      return res;
    })
  // .then(res => {
  //   const response = new Response(res.body, res)
  //   const cacheControlDirectives = res.headers.get('cache-control').split(',')
  //   const defaultMaxAge = 60 * 60
  //   for (const directive of cacheControlDirectives) {
  //     const [key, value] = directive.split('=')
  //     if (key.trim().toLowerCase() === 'max-age') {
  //       directive[1] = Math.min(defaultMaxAge, Number(value))
  //       break
  //     }
  //   }
  //   const cacheControlValue = cacheControlDirectives.join(', ')
  //   response.headers.set('cache-control', cacheControlValue)
  //   return response
  // })
  //   .then(res => {
  //     console.log({ res })
  //     // res.json().then((t) => console.log({ t }))
  //   })
  //   .catch(err => console.log({err}))
  // return new Response('response from CF Worker')
}

export async function handleRequest(event) {
  const url = new URL(event.request.url);
  const pathname = url.pathname;
  if (pathname === `${ROUTE}${PATH_FOR_SCRIPT_DOWNLOAD}`) {
    return handleDownloadScript(event);
  } else if (pathname === `${ROUTE}${PATH_FOR_GET_ENDPOINT}`) {
    try {
      // const endpoint = url.searchParams.get('endpoint');
      const endpoint = 'https://api.fpjs.io/?ci=js/3.5.4'
      return handleRequestRaw(event.request, endpoint)
    } catch (e) {
      return createErrorResponse(e.message)
    }
  } else {
    return createErrorResponse(`unmatched path ${pathname}`)
  }
}

export default {
  async fetch(request){
    return handleRequest({request})
  }
}
