'use strict';

const { Octokit } = require('@octokit/rest');
const { graphql } = require('@octokit/graphql');
const fs = require('fs');

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const PROJECT_ID = process.env.PROJECT_ID;
const TOKEN = process.env.GITHUB_TOKEN;

const octokit = new Octokit({ auth: TOKEN });
const gql = graphql.defaults({ headers: { authorization: `token ${TOKEN}` } });

// ─── VALID VALUES ────────────────────────────────────────────────────────────

const VALID_TYPES = ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'test', 'perf', 'ci'];
const VALID_STATUSES = ['backlog', 'ready', 'in_progress', 'in_review', 'done'];
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];
const VALID_MILESTONES = ['v1', 'v2'];
const VALID_COMPLEXITIES = ['XS', 'S', 'M', 'L', 'XL'];

const STATUS_TO_COLUMN = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

// ─── PARSE BACKLOG ───────────────────────────────────────────────────────────

function parseBacklog(content) {
  const items = [];
  const errors = [];
  const warnings = [];

  const blocks = content.split('<!-- ITEM:BEGIN -->').slice(1);

  for (const block of blocks) {
    const raw = block.split('<!-- ITEM:END -->')[0].trim();
    const item = {};
    const itemErrors = [];

    const headingMatch = raw.match(/^###\s+\[([A-Z]+-\d+)\]/m);
    if (!headingMatch) {
      errors.push('Found an item block with no valid ID in heading — aborting.');
      continue;
    }
    item.id = headingMatch[1];

    const field = (name) => {
      const match = raw.match(new RegExp(`^-\\s+\\*\\*${name}:\\*\\*\\s+(.+)$`, 'm'));
      return match ? match[1].trim() : null;
    };

    const listField = (name) => {
      const match = raw.match(new RegExp(`^-\\s+\\*\\*${name}:\\*\\*\\s+\\[(.*)\\]$`, 'm'));
      if (!match) return null;
      return match[1].split(',').map(s => s.trim()).filter(Boolean);
    };

    item.type = field('type');
    item.milestone = field('milestone');
    item.status = field('status');
    item.priority = field('priority');
    item.domain = field('domain');
    item.complexity = field('complexity');
    item.parent = field('parent');
    item.dependsOn = field('depends-on');
    item.labels = listField('labels');
    item.learning = listField('learning');

    const descMatch = raw.match(/####\s+Description\s+([\s\S]*?)(?=####|$)/);
    item.description = descMatch ? descMatch[1].trim() : '';

    const acMatch = raw.match(/####\s+Acceptance criteria\s+([\s\S]*?)(?=####|$)/);
    item.acceptanceCriteria = acMatch ? acMatch[1].trim() : '';

    // ── Validation ──────────────────────────────────────────────────────────

    if (!item.type) itemErrors.push(`[${item.id}] Missing field: type`);
    else if (!VALID_TYPES.includes(item.type)) itemErrors.push(`[${item.id}] Invalid type: '${item.type}'`);

    if (!item.status) itemErrors.push(`[${item.id}] Missing field: status`);
    else if (!VALID_STATUSES.includes(item.status)) itemErrors.push(`[${item.id}] Invalid status: '${item.status}'`);

    if (!item.priority) itemErrors.push(`[${item.id}] Missing field: priority`);
    else if (!VALID_PRIORITIES.includes(item.priority)) itemErrors.push(`[${item.id}] Invalid priority: '${item.priority}'`);

    if (!item.milestone) itemErrors.push(`[${item.id}] Missing field: milestone`);
    else if (!VALID_MILESTONES.includes(item.milestone)) itemErrors.push(`[${item.id}] Invalid milestone: '${item.milestone}'`);

    if (!item.complexity) itemErrors.push(`[${item.id}] Missing field: complexity`);
    else if (!VALID_COMPLEXITIES.includes(item.complexity)) itemErrors.push(`[${item.id}] Invalid complexity: '${item.complexity}'`);

    if (!item.domain) itemErrors.push(`[${item.id}] Missing field: domain`);

    if (itemErrors.length > 0) {
      errors.push(...itemErrors);
    } else {
      items.push(item);
    }
  }

  return { items, errors, warnings };
}

// ─── VALIDATE DEPENDENCIES ───────────────────────────────────────────────────

function validateDependencies(items) {
  const errors = [];
  const ids = new Set(items.map(i => i.id));

  for (const item of items) {
    if (item.parent && item.parent !== '~' && !ids.has(item.parent)) {
      errors.push(`[${item.id}] parent references unknown ID: '${item.parent}'`);
    }
    if (!item.dependsOn || item.dependsOn === '~') continue;
    const deps = item.dependsOn.split(',').map(s => s.trim());
    for (const dep of deps) {
      if (dep !== '~' && !ids.has(dep)) {
        errors.push(`[${item.id}] depends-on references unknown ID: '${dep}'`);
      }
    }
  }

  return errors;
}

// ─── GITHUB HELPERS ──────────────────────────────────────────────────────────

async function ensureLabel(name, color = 'ededed') {
  try {
    await octokit.issues.getLabel({ owner: OWNER, repo: REPO, name });
  } catch {
    await octokit.issues.createLabel({ owner: OWNER, repo: REPO, name, color });
    console.log(`Created label: ${name}`);
  }
}

async function ensureMilestone(title) {
  const { data: milestones } = await octokit.issues.listMilestones({ owner: OWNER, repo: REPO });
  const existing = milestones.find(m => m.title === title);
  if (existing) return existing.number;
  const { data } = await octokit.issues.createMilestone({ owner: OWNER, repo: REPO, title });
  console.log(`Created milestone: ${title}`);
  return data.number;
}

async function findIssueByBacklogId(id) {
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `repo:${OWNER}/${REPO} in:body "backlog-id: ${id}"`,
  });
  return data.items.length > 0 ? data.items[0] : null;
}

async function getProjectFieldInfo() {
  const result = await gql(`
    query($project: ID!) {
      node(id: $project) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }
  `, { project: PROJECT_ID });

  return result.node.fields.nodes.find(f => f.name === 'Status');
}

async function getProjectItemId(issueNumber) {
  const result = await gql(`
    query($project: ID!) {
      node(id: $project) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              content { ... on Issue { number } }
            }
          }
        }
      }
    }
  `, { project: PROJECT_ID });

  const item = result.node.items.nodes.find(n => n.content?.number === issueNumber);
  return item ? item.id : null;
}

async function addIssueToProject(issueNodeId) {
  const result = await gql(`
    mutation($project: ID!, $content: ID!) {
      addProjectV2ItemById(input: { projectId: $project, contentId: $content }) {
        item { id }
      }
    }
  `, { project: PROJECT_ID, content: issueNodeId });
  return result.addProjectV2ItemById.item.id;
}

async function moveIssueToColumn(itemId, fieldId, optionId) {
  await gql(`
    mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $project
        itemId: $item
        fieldId: $field
        value: { singleSelectOptionId: $option }
      }) {
        projectV2Item { id }
      }
    }
  `, { project: PROJECT_ID, item: itemId, field: fieldId, option: optionId });
}

// ─── BUILD ISSUE BODY ────────────────────────────────────────────────────────

function buildIssueBody(item) {
  const deps = item.dependsOn && item.dependsOn !== '~' ? item.dependsOn : 'none';
  const parent = item.parent && item.parent !== '~' ? item.parent : 'none';

  return `<!-- backlog-id: ${item.id} -->

**Type:** ${item.type} | **Priority:** ${item.priority} | **Complexity:** ${item.complexity} | **Milestone:** ${item.milestone}
**Domain:** ${item.domain} | **Status:** ${item.status}
**Parent:** ${parent} | **Depends on:** ${deps}

---

### Description

${item.description}

---

### Acceptance criteria

${item.acceptanceCriteria}
`;
}

// ─── BUILD ISSUE TITLE ───────────────────────────────────────────────────────

function buildIssueTitle(item) {
  const firstLine = item.description.split('\n').find(l => l.trim()) || item.id;
  return `[${item.id}] ${firstLine.substring(0, 80)}`;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading BACKLOG.md...');
  const backlogPath = require('path').resolve(__dirname, '../../BACKLOG.md');
  console.log(`BACKLOG.md path: ${backlogPath}`);
  const content = fs.readFileSync(backlogPath, 'utf8');

  console.log('Parsing backlog...');
  const { items, errors, warnings } = parseBacklog(content);

  for (const w of warnings) console.warn(`⚠ ${w}`);

  if (errors.length > 0) {
    console.error('Backlog validation failed — aborting sync:');
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }

  const depErrors = validateDependencies(items);
  if (depErrors.length > 0) {
    console.error('Dependency validation failed — aborting sync:');
    for (const e of depErrors) console.error(`✗ ${e}`);
    process.exit(1);
  }

  console.log(`Parsed ${items.length} valid items.`);

  const statusField = await getProjectFieldInfo();
  if (!statusField) {
    console.error('Could not find Status field in project — aborting.');
    process.exit(1);
  }

  const getOptionId = (columnName) => {
    const option = statusField.options.find(o => o.name === columnName);
    return option ? option.id : null;
  };

  // Find issues removed from backlog — close them
  console.log('Checking for removed items...');
  const { data: allIssues } = await octokit.issues.listForRepo({
    owner: OWNER, repo: REPO, state: 'open', per_page: 100,
  });

  const backlogIds = new Set(items.map(i => i.id));
  for (const issue of allIssues) {
    const match = issue.body?.match(/<!-- backlog-id: ([A-Z]+-\d+) -->/);
    if (match && !backlogIds.has(match[1])) {
      console.log(`Item ${match[1]} removed from backlog — closing issue #${issue.number}`);
      await ensureLabel('status:removed', 'b60205');
      await octokit.issues.update({
        owner: OWNER, repo: REPO, issue_number: issue.number, state: 'closed',
      });
      await octokit.issues.addLabels({
        owner: OWNER, repo: REPO, issue_number: issue.number, labels: ['status:removed'],
      });
    }
  }

  // Sync each item
  for (const item of items) {
    console.log(`\nProcessing ${item.id}...`);

    const labelsToApply = [...(item.labels || [])];
    if (item.parent && item.parent !== '~') {
      labelsToApply.push(`group:${item.parent}`);
    }
    for (const label of labelsToApply) {
      await ensureLabel(label);
    }

    const milestoneNumber = await ensureMilestone(item.milestone);
    const body = buildIssueBody(item);
    const title = buildIssueTitle(item);
    const existing = await findIssueByBacklogId(item.id);

    let issueNumber;
    let issueNodeId;

    if (!existing) {
      console.log(`  Creating issue for ${item.id}...`);
      const { data: created } = await octokit.issues.create({
        owner: OWNER,
        repo: REPO,
        title,
        body,
        labels: labelsToApply,
        milestone: milestoneNumber,
      });
      issueNumber = created.number;
      issueNodeId = created.node_id;
      console.log(`  Created issue #${issueNumber}`);

      const projectItemId = await addIssueToProject(issueNodeId);
      const columnName = STATUS_TO_COLUMN[item.status] || 'Backlog';
      const optionId = getOptionId(columnName);
      if (optionId) {
        await moveIssueToColumn(projectItemId, statusField.id, optionId);
        console.log(`  Moved to column: ${columnName}`);
      } else {
        console.warn(`  ⚠ Column '${columnName}' not found in project`);
      }
    } else {
      issueNumber = existing.number;
      issueNodeId = existing.node_id;

      if (!existing.body?.includes(`<!-- backlog-id: ${item.id} -->`)) {
        console.warn(`  ⚠ [${item.id}] Issue #${issueNumber} body was modified on GitHub — backlog.md wins, overwriting.`);
      }

      const titleChanged = existing.title !== title;
      const bodyChanged = existing.body !== body;

      if (titleChanged || bodyChanged) {
        console.log(`  Updating issue #${issueNumber}...`);
        await octokit.issues.update({
          owner: OWNER,
          repo: REPO,
          issue_number: issueNumber,
          title,
          body,
          labels: labelsToApply,
          milestone: milestoneNumber,
        });
        console.log(`  Updated issue #${issueNumber}`);
      } else {
        console.log(`  Issue #${issueNumber} is up to date — skipping`);
      }

      let projectItemId = await getProjectItemId(issueNumber);
      if (!projectItemId) {
        console.log(`  Issue #${issueNumber} not in project yet — adding...`);
        projectItemId = await addIssueToProject(issueNodeId);
      }

      const columnName = STATUS_TO_COLUMN[item.status] || 'Backlog';
      const optionId = getOptionId(columnName);
      if (optionId) {
        await moveIssueToColumn(projectItemId, statusField.id, optionId);
        console.log(`  Kanban column synced to: ${columnName}`);
      } else {
        console.warn(`  ⚠ Column '${columnName}' not found in project`);
      }
    }
  }

  console.log('\nSync complete.');
}

main().catch(err => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
