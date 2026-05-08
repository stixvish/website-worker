import { jsonResponse, errorResponse, getAllowedOrigin } from '../utils/response.js';

const CACHE_KEY = new Request('https://cache/github');
const CACHE_TTL = 3600;

export async function handleGithub(request, env, ctx) {
	const cache = caches.default;
	const cached = await cache.match(CACHE_KEY);

	if (cached) {
		const headers = new Headers(cached.headers);
		headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
		return new Response(cached.body, { ...cached, headers });
	}

	const headers = {
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		'Content-Type': 'application/json',
		'User-Agent': 'stixvish-portfolio',
	};

	const query = `
    query {
      user(login: "stixvish") {
        avatarUrl
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
        repositories(
          first: 1
          orderBy: { field: PUSHED_AT, direction: DESC }
          ownerAffiliations: OWNER
          privacy: PUBLIC
        ) {
          nodes {
            name
            description
            url
            pushedAt
            primaryLanguage {
              name
              color
            }
            defaultBranchRef {
              name
              target {
                ... on Commit {
                  message
                }
              }
            }
          }
        }
      }
    }
  `;

	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers,
		body: JSON.stringify({ query }),
	});

	if (!res.ok) {
		return errorResponse('failed to fetch github data', request, 500);
	}

	const data = await res.json();
	const user = data.data?.user;

	if (!user) {
		return errorResponse('user not found', request, 404);
	}

	const calendar = user.contributionsCollection.contributionCalendar;
	const allDays = calendar.weeks.flatMap((w) => w.contributionDays);

	const today = new Date().toISOString().split('T')[0];
	let streak = 0;
	for (let i = allDays.length - 1; i >= 0; i--) {
		const day = allDays[i];
		if (day.date > today) continue;
		if (day.contributionCount === 0) {
			if (day.date === today) continue;
			break;
		}
		streak++;
	}

	const repo = user.repositories.nodes[0] ?? null;
	const branchRef = repo?.defaultBranchRef ?? null;

	const response = jsonResponse(
		{
			totalContributions: calendar.totalContributions,
			streak,
			avatarUrl: user.avatarUrl ?? null,
			lastRepo: repo
				? {
						name: repo.name,
						description: repo.description,
						url: repo.url,
						pushedAt: repo.pushedAt,
						language: repo.primaryLanguage ?? null,
						lastCommit: branchRef
							? {
									message: branchRef.target?.message ?? null,
									branch: branchRef.name,
								}
							: null,
					}
				: null,
		},
		request,
		200,
		CACHE_TTL,
	);

	ctx.waitUntil(cache.put(CACHE_KEY, response.clone()));
	return response;
}
