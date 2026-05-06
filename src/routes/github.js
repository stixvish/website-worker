import { jsonResponse, errorResponse } from '../utils/response.js';

export async function handleGithub(request, env) {
	const headers = {
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		'Content-Type': 'application/json',
		'User-Agent': 'stixvish-portfolio',
	};

	const query = `
    query {
      user(login: "${env.GITHUB_USERNAME}") {
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

	// calculate current streak
	const today = new Date().toISOString().split('T')[0];
	let streak = 0;
	for (let i = allDays.length - 1; i >= 0; i--) {
		const day = allDays[i];
		if (day.date > today) continue;
		if (day.contributionCount === 0) break;
		streak++;
	}

	const repo = user.repositories.nodes[0] ?? null;

	return jsonResponse(
		{
			totalContributions: calendar.totalContributions,
			streak,
			lastRepo: repo
				? {
						name: repo.name,
						description: repo.description,
						url: repo.url,
						pushedAt: repo.pushedAt,
						language: repo.primaryLanguage ?? null,
					}
				: null,
		},
		request,
		200,
		3600,
	);
}
