// AUTO-GENERATED FILE. ANY CHANGES WILL BE OVERRIDEN

const ROUTE = '/abcd1234';
const PATH_FOR_SCRIPT_DOWNLOAD = '/ghjklmno56789';
const PATH_FOR_GET_ENDPOINT = '/qwerty13579';

function getVisitorIdEndpoint(region) {
  const prefix = region === 'us' ? '' : `${region}.`;
  return `https://${prefix}api.fpjs.io`;
}

function createCookieStringFromObject(name, value) {
  const filtered = Object.entries(value).filter(([k]) => k !== 'name' && k !== 'value');
  const nameValue = `${name}=${value.value}`;
  const rest = filtered.map(([k,v]) => `${k}=${v}`);
  return [nameValue, ...rest].join('; ');
}

function createResponse(request, response) {
  const origin = request.headers.get('origin')
  // const domain = psl.get((new URL(origin)).hostname) || undefined
  const domain = (new URL(origin)).hostname
  const newHeaders = new Headers(response.headers)
  console.log({get: newHeaders.get('set-cookie')})
  console.log({getAll: newHeaders.getAll('set-cookie')})
  // todo make cookie first party
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })

  return newResponse
}

function createErrorResponse(reason) {
  const responseBody = {
    message: 'An error occurred with Cloudflare worker.',
    reason,
  }
  return new Response(JSON.stringify(responseBody), { status: 500 })
}

async function handleIngressAPIRaw(event, endpoint) {
  if (event == null) {
    throw new Error('event is null');
  }

  if (event.request == null) {
    throw new Error('request is null');
  }

  if (endpoint == null) {
    throw new Error('endpoint is null');
  }

  const requestHeaders = new Headers(event.request)
  requestHeaders.set('user-agent', event.request.get('user-agent'))

  const newRequest = new Request(endpoint, new Request(event.request, {
    headers: requestHeaders
  }))

  const response = await fetch(newRequest)
  return createResponse(event.request, response)
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
  const browserToken = 'abcd1234' // todo
  const url = `https://fpcdn.io/v3/${browserToken}`;
  const newRequest = new Request(url, new Request(event.request, {
    headers: new Headers(event.request.headers)
  }))

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

async function handleIngressAPI(event){
    const url = new URL(event.request.url);
    const region = url.searchParams.get('region') || 'us';
    const endpoint = getVisitorIdEndpoint(region)
  try {
    return handleIngressAPIRaw(event, endpoint)
  } catch (e) {
    return createErrorResponse(e.message)
  }
}

export async function handleRequest(event) {
  const url = new URL(event.request.url);
  console.log({url})
  const pathname = url.pathname;
  if (pathname === `${ROUTE}${PATH_FOR_SCRIPT_DOWNLOAD}`) {
    return handleDownloadScript(event);
  } else if (pathname === `${ROUTE}${PATH_FOR_GET_ENDPOINT}`) {
    return handleIngressAPI(event)
  } else {
    return createErrorResponse(`unmatched path ${pathname}`)
  }
}

export default {
  async fetch(request){
    return handleRequest({request})
  }
}
