'use strict';

// Run with: node --test .github/scripts/
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.GITHUB_OWNER = 'owner';
process.env.GITHUB_REPO = 'repo';
const { commitPromotionsViaPullRequest } = require('./sync-backlog');

function makeGithubMock({ openPulls = [] } = {}) {
  const calls = [];
  const record = (name, result = {}) => async (args) => {
    calls.push({ name, args });
    return { data: result };
  };
  const octokit = {
    pulls: {
      list: record('pulls.list', openPulls),
      update: record('pulls.update'),
      create: record('pulls.create', { number: 42, node_id: 'PR_node_42' }),
      merge: record('pulls.merge'),
    },
    git: {
      getRef: record('git.getRef', { object: { sha: 'main-sha' } }),
      createRef: record('git.createRef'),
      deleteRef: record('git.deleteRef'),
    },
    repos: {
      getContent: record('repos.getContent', { sha: 'file-sha' }),
      createOrUpdateFileContents: record('repos.createOrUpdateFileContents'),
    },
  };
  const gql = async (query, variables) => {
    calls.push({ name: 'gql', args: { query, variables } });
    return {};
  };
  return { octokit, gql, calls, find: (name) => calls.filter((call) => call.name === name) };
}

test('does not skip CI on the promotion commit, so the required check can run', async () => {
  const github = makeGithubMock();

  await commitPromotionsViaPullRequest(['FEAT-026'], 'content', github);

  const [commit] = github.find('repos.createOrUpdateFileContents');
  assert.doesNotMatch(commit.args.message, /\[skip ci\]/);
});

test('enables auto-merge on the new pull request instead of merging it right away', async () => {
  const github = makeGithubMock();

  await commitPromotionsViaPullRequest(['FEAT-026'], 'content', github);

  assert.equal(github.find('pulls.merge').length, 0);
  const [autoMerge] = github.find('gql');
  assert.match(autoMerge.args.query, /enablePullRequestAutoMerge/);
  assert.equal(autoMerge.args.variables.pullRequestId, 'PR_node_42');
});

test('closes earlier auto-promotion pull requests still open, and deletes their branches', async () => {
  const github = makeGithubMock({
    openPulls: [
      { number: 278, head: { ref: 'chore/backlog-auto-promote-1' } },
      { number: 100, head: { ref: 'feat/unrelated' } },
    ],
  });

  await commitPromotionsViaPullRequest(['FEAT-026'], 'content', github);

  assert.deepEqual(
    github.find('pulls.update').map((call) => [call.args.pull_number, call.args.state]),
    [[278, 'closed']],
  );
  assert.deepEqual(
    github.find('git.deleteRef').map((call) => call.args.ref),
    ['heads/chore/backlog-auto-promote-1'],
  );
});
