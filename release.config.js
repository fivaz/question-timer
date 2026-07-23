// eslint-disable-next-line import/no-anonymous-default-export
export default {
	branches: ["main", "master"],
	tagFormat: "v${version}",
	plugins: [
		[
			"@semantic-release/commit-analyzer",
			{
				preset: "conventionalcommits",
				releaseRules: [
					{ type: "chore", release: "patch" },
					{ type: "docs", release: "patch" },
					{ type: "style", release: "patch" },
					{ type: "ci", release: "patch" },
					{ type: "refactor", release: "patch" },
				],
			},
		],
		[
			"@semantic-release/release-notes-generator",
			{
				preset: "conventionalcommits",
				presetConfig: {
					types: [
						{ type: "feat", section: "✨ Features", hidden: false },
						{ type: "fix", section: "🐛 Bug Fixes", hidden: false },
						{ type: "perf", section: "🚀 Performance Improvements", hidden: false },
						{ type: "revert", section: "⏪ Reverts", hidden: false },
						{ type: "chore", section: "🧹 Chores", hidden: false },
						{ type: "docs", section: "📝 Documentation", hidden: false },
						{ type: "style", section: "💄 Styles", hidden: false },
						{ type: "refactor", section: "🔨 Code Refactoring", hidden: false },
						{ type: "test", section: "✅ Tests", hidden: false },
						{ type: "build", section: "👷 Build System", hidden: false },
						{ type: "ci", section: "🔧 Continuous Integration", hidden: false },
					],
				},
			},
		],
		["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
		["@semantic-release/npm", { npmPublish: false }],
		[
			"@semantic-release/git",
			{
				assets: ["package.json", "pnpm-lock.yaml", "CHANGELOG.md"],
				message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
			},
		],
		"@semantic-release/github",
	],
};
