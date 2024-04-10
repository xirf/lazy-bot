import { userAgent } from "../config.json"

const headers = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
}

async function resolveUrl(url: string) {
    return fetch(url, { headers })
        .then(r => {
            if (r.headers.get('location')) {
                return decodeURIComponent(r.headers.get('location'))
            }
            if (r.headers.get('link')) {
                const linkMatch = r.headers.get('link').match(/<(.*?)\/>/)
                return decodeURIComponent(linkMatch[ 1 ])
            }
            return false
        })
        .catch(() => false)
}

export default async function ({ shortLink, username, id }) {
    try {
        const isShortLink = !!shortLink?.length;

        let url = isShortLink
            ? `https://fb.watch/${shortLink}`
            : `https://web.facebook.com/${username}/videos/${id}`;

        if (isShortLink) {
            const resolvedUrl = await resolveUrl(url);
            if (typeof resolvedUrl === "string") {
                url = resolvedUrl;
            } else {
                throw { error: "ErrorResolveUrl" }
            }
        }

        const response = await fetch(url, { headers });
        const html = await response.text();

        if (!html) {
            throw { error: 'ErrorCouldntFetch' };
        }

        const urls = [
            ...extractUrlsFromHtml(html, '"browser_native_hd_url":"(.*?)"'),
            ...extractUrlsFromHtml(html, '"browser_native_sd_url":"(.*?)"'),
        ];

        if (!urls.length) {
            throw { error: 'ErrorEmptyDownload' };
        }

        const filename = isShortLink
            ? `facebook_${shortLink}.mp4`
            : username?.length && username !== 'user'
                ? `facebook_${username}_${id}.mp4`
                : `facebook_${id}.mp4`;

        return { urls, filename };
    } catch (error) {
        throw error;
    }
}

function extractUrlsFromHtml(html: string, regex: string) {
    const match = html.match(regex);
    return match?.length ? [ JSON.parse(`["${match[ 1 ]}"]`)[ 0 ] ] : [];
}