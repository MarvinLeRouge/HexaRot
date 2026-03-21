'use strict';

const { Octokit } = require('@octokit/rest');
const { graphql } = require('@octokit/graphql');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const PROJECT_ID = process.env.PROJECT_ID;
const TOKEN = process.env.GITHUB_TOKEN;

const octokit = new Octokit({ auth: TOKEN });
const gql = graphql.defaults({ headers: { authorization: `token ${TOKEN}` } });

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

  const blocks = content.split(/<!-- ITEM:BEGIN -->\n/).slice(1);

  for (const block of blocks) {
    const raw = block.split(/\n<!-- ITEM:END -->/).slice(0, 1)[0].trim();
    const item = {};
    const itemErrors = [];

    const headingMatch = raw.match(/^###\s+\[([A-Z]+-\d+)\]/m);
    if (!headingMatch) {
      errors.push('Found an item block with no valid ID in heading — aborting.');
      continue;
    }
    item.id = headingMatch[1];

    const field = (name) => {
      const match = raw.match(new RegExp('^-\\s+\\*\\*' + name + ':\\*\\*\\s+(.+)$', 'm'));
      return match ? match[1].trim() : null;
    };

    const listField = (name) => {
      const match = raw.match(new RegExp('^-\\s+\\*\\*' + name + ':\\*\\*\\s+\\[(.*)\\]$', 'm'));
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

    if (!item.type) itemErrors.push('[' + item.id + '] Missing field: type');
    else if (!VALID_TYPES.includes(item.type)) itemErrors.push('[' + item.id + '] Invalid type: ' + item.type);

    if (!item.status) itemErrors.push('[' + item.id + '] Missing field: status');
    else if (!VALID_STATUSES.includes(item.status)) itemErrors.push('[' + item.id + '] Invalid status: ' + item.status);

    if (!item.priority) itemErrors.push('[' + item.id + '] Missing field: priority');
    else if (!VALID_PRIORITIES.includes(item.priority)) itemErrors.push('[' + item.id + '] Invalid priority: ' + item.priority);

    if (!item.milestone) itemErrors.push('[' + item.id + '] Missing field: milestone');
    else if (!VALID_MILESTONES.includes(item.milestone)) itemErrors.push('[' + item.id + '] Invalid milestone: ' + item.milestone);

    if (!item.complexity) itemErrors.push('[' + item.id + '] Missing field: complexity');
    else if (!VALID_COMPLEXITIES.includes(item.complexity)) itemErrors.push('[' + item.id + '] Invalid complexity: ' + item.complexity);

    if (!item.domain) itemErrors.push('[' + item.id + '] Missing field: domain');

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
      errors.push('[' + item.id + '] parent references unknown ID: ' + item.parent);
    }
    if (!item.dependsOn || item.dependsOn === '~') continue;
    const deps = item.dependsOn.split(',').map(s => s.trim());
    for (const dep of deps) {
      if (dep !== '~' && !ids.has(dep)) {
        errors.push('[' + item.id + '] depends-on references unknown ID: ' + dep);
      }
    }
  }

  return errors;
}

// ─── STATUS COHERENCE ────────────────────────────────────────────────────────

function validateStatusCoherence(items) {
  const errors = [];
  const statusMap = new Map(items.map(i => [i.id, i.status]));

  for (const item of items) {
    if (item.status !== 'ready') continue;
    if (!item.dependsOn || item.dependsOn === '~') continue;

    const deps = item.dependsOn.split(',').map(s => s.trim()).filter(d => d !== '~');
    for (const dep of deps) {
      const depStatus = statusMap.get(dep);
      if (depStatus && depStatus !== 'done') {
        errors.push(
          '[' + item.id + '] is ready but dependency ' + dep + ' is ' + depStatus + ' (must be done)'
        );
      }
    }
  }

  return errors;
}

function computeReadyPromotions(items) {
  const statusMap = new Map(items.map(i => [i.id, i.status]));
  const promotions = [];

  for (const item of items) {
    if (item.status !== 'backlog') continue;

    if (!item.dependsOn || item.dependsOn === '~') {
      promotions.push(item.id);
      continue;
    }

    const deps = item.dependsOn.split(',').map(s => s.trim()).filter(d => d !== '~');
    const allDone = deps.every(dep => statusMap.get(dep) === 'done');
    if (allDone) promotions.push(item.id);
  }

  return promotions;
}

function applyReadyPromotions(content, promotions) {
  let updated = content;
  for (const id of promotions) {
    const escapedId = id.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(
      '(<!-- ITEM:BEGIN -->\\n[\\s\\S]*?\\[' + escapedId + '\\][\\s\\S]*?- \\*\\*status:\\*\\* )backlog',
      'g'
    );
    updated = updated.replace(regex, '$1ready');
  }
  return updated;
}

// ─── GITHUB HELPERS ──────────────────────────────────────────────────────────

async function ensureLabel(name, color) {
  const labelColor = color || 'ededed';
  try {
    await octokit.issues.getLabel({ owner: OWNER, repo: REPO, name });
  } catch (_e) {
    await octokit.issues.createLabel({ owner: OWNER, repo: REPO, name, color: labelColor });
    console.log('Created label: ' + name);
  }
}

async function ensureMilestone(title) {
  const { data: milestones } = await octokit.issues.listMilestones({ owner: OWNER, repo: REPO });
  const existing = milestones.find(m => m.title === title);
  if (existing) return existing.number;
  const { data } = await octokit.issues.createMilestone({ owner: OWNER, repo: REPO, title });
  console.log('Created milestone: ' + title);
  return data.number;
}

async function loadAllBacklogIssues() {
  const issueMap = new Map();
  let page = 1;
  while (true) {
    const { data } = await octokit.issues.listForRepo({
      owner: OWNER, repo: REPO, state: 'all', per_page: 100, page,
    });
    if (data.length === 0) break;
    for (const issue of data) {
      const match = issue.body && issue.body.match(/<!-- backlog-id: ([A-Z]+-\d+) -->/);
      if (match) issueMap.set(match[1], issue);
    }
    if (data.length < 100) break;
    page++;
  }
  return issueMap;
}

async function getProjectFieldInfo() {
  const result = await gql(
    'query($project: ID!) { node(id: $project) { ... on ProjectV2 { fields(first: 20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }',
    { project: PROJECT_ID }
  );
  return result.node.fields.nodes.find(f => f.name === 'Status');
}

async function getProjectItemId(issueNumber) {
  const result = await gql(
    'query($project: ID!) { node(id: $project) { ... on ProjectV2 { items(first: 100) { nodes { id content { ... on Issue { number } } } } } } }',
    { project: PROJECT_ID }
  );
  const item = result.node.items.nodes.find(n => n.content && n.content.number === issueNumber);
  return item ? item.id : null;
}

async function addIssueToProject(issueNodeId) {
  const result = await gql(
    'mutation($project: ID!, $content: ID!) { addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } } }',
    { project: PROJECT_ID, content: issueNodeId }
  );
  return result.addProjectV2ItemById.item.id;
}

async function moveIssueToColumn(itemId, fieldId, optionId) {
  await gql(
    'mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) { updateProjectV2ItemFieldValue(input: { projectId: $project itemId: $item fieldId: $field value: { singleSelectOptionId: $option } }) { projectV2Item { id } } }',
    { project: PROJECT_ID, item: itemId, field: fieldId, option: optionId }
  );
}

// ─── BUILD ISSUE BODY / TITLE ─────────────────────────────────────────────────

function buildIssueBody(item) {
  const deps = item.dependsOn && item.dependsOn !== '~' ? item.dependsOn : 'none';
  const parent = item.parent && item.parent !== '~' ? item.parent : 'none';

  return '<!-- backlog-id: ' + item.id + ' -->\n\n' +
    '**Type:** ' + item.type + ' | **Priority:** ' + item.priority + ' | **Complexity:** ' + item.complexity + ' | **Milestone:** ' + item.milestone + '\n' +
    '**Domain:** ' + item.domain + ' | **Status:** ' + item.status + '\n' +
    '**Parent:** ' + parent + ' | **Depends on:** ' + deps + '\n\n' +
    '---\n\n' +
    '### Description\n\n' + item.description + '\n\n' +
    '---\n\n' +
    '### Acceptance criteria\n\n' + item.acceptanceCriteria + '\n';
}

function buildIssueTitle(item) {
  const firstLine = item.description.split('\n').find(l => l.trim()) || item.id;
  return '[' + item.id + '] ' + firstLine.substring(0, 80);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Reading BACKLOG.md...');
  const backlogPath = path.resolve(__dirname, '../../BACKLOG.md');
  let content = fs.readFileSync(backlogPath, 'utf8');

  console.log('Parsing backlog...');
  const { items, errors, warnings } = parseBacklog(content);

  for (const w of warnings) console.warn('WARNING: ' + w);

  if (errors.length > 0) {
    console.error('Backlog validation failed — aborting sync:');
    for (const e of errors) console.error('  x ' + e);
    process.exit(1);
  }

  const depErrors = validateDependencies(items);
  if (depErrors.length > 0) {
    console.error('Dependency validation failed — aborting sync:');
    for (const e of depErrors) console.error('  x ' + e);
    process.exit(1);
  }

  const coherenceErrors = validateStatusCoherence(items);
  if (coherenceErrors.length > 0) {
    console.error('Status coherence validation failed — aborting sync:');
    for (const e of coherenceErrors) console.error('  x ' + e);
    process.exit(1);
  }

  const promotions = computeReadyPromotions(items);
  if (promotions.length > 0) {
    console.log('Auto-promoting to ready: ' + promotions.join(', '));
    content = applyReadyPromotions(content, promotions);
    fs.writeFileSync(backlogPath, content, 'utf8');

    // Commit the updated BACKLOG.md
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', { cwd: path.resolve(__dirname, '../..') });
    execSync('git config user.name "github-actions[bot]"', { cwd: path.resolve(__dirname, '../..') });
    execSync('git add BACKLOG.md', { cwd: path.resolve(__dirname, '../..') });
    execSync('git commit -m "chore(backlog): auto-promote ready items [skip ci]"', { cwd: path.resolve(__dirname, '../..') });
    execSync('git push', { cwd: path.resolve(__dirname, '../..') });
    console.log('BACKLOG.md updated and pushed.');

    // Re-parse with updated content
    const reparsed = parseBacklog(content);
    items.length = 0;
    items.push(...reparsed.items);
  }

  console.log('Parsed ' + items.length + ' valid items.');

  const statusField = await getProjectFieldInfo();
  if (!statusField) {
    console.error('Could not find Status field in project — aborting.');
    process.exit(1);
  }

  const getOptionId = (columnName) => {
    const option = statusField.options.find(o => o.name === columnName);
    return option ? option.id : null;
  };

  console.log('Loading existing issues...');
  const existingIssues = await loadAllBacklogIssues();
  console.log('Found ' + existingIssues.size + ' existing backlog issues.');

  // Close issues removed from backlog
  console.log('Checking for removed items...');
  const backlogIds = new Set(items.map(i => i.id));
  for (const [id, issue] of existingIssues) {
    if (!backlogIds.has(id) && issue.state === 'open') {
      console.log('Item ' + id + ' removed from backlog — closing issue #' + issue.number);
      await ensureLabel('status:removed', 'b60205');
      await octokit.issues.update({ owner: OWNER, repo: REPO, issue_number: issue.number, state: 'closed' });
      await octokit.issues.addLabels({ owner: OWNER, repo: REPO, issue_number: issue.number, labels: ['status:removed'] });
    }
  }

  // Sync each item
  for (const item of items) {
    console.log('\nProcessing ' + item.id + '...');

    const labelsToApply = (item.labels || []).slice();
    if (item.parent && item.parent !== '~') {
      labelsToApply.push('group:' + item.parent);
    }
    for (const label of labelsToApply) {
      await ensureLabel(label);
    }

    const milestoneNumber = await ensureMilestone(item.milestone);
    const body = buildIssueBody(item);
    const title = buildIssueTitle(item);
    const existing = existingIssues.get(item.id);

    let issueNumber;
    let issueNodeId;

    if (!existing) {
      console.log('  Creating issue for ' + item.id + '...');
      const { data: created } = await octokit.issues.create({
        owner: OWNER, repo: REPO, title, body, labels: labelsToApply, milestone: milestoneNumber,
      });
      issueNumber = created.number;
      issueNodeId = created.node_id;
      console.log('  Created issue #' + issueNumber);

      const projectItemId = await addIssueToProject(issueNodeId);
      const columnName = STATUS_TO_COLUMN[item.status] || 'Backlog';
      const optionId = getOptionId(columnName);
      if (optionId) {
        await moveIssueToColumn(projectItemId, statusField.id, optionId);
        console.log('  Moved to column: ' + columnName);
      } else {
        console.warn('  WARNING: Column ' + columnName + ' not found in project');
      }
    } else {
      issueNumber = existing.number;
      issueNodeId = existing.node_id;

      if (!existing.body || !existing.body.includes('<!-- backlog-id: ' + item.id + ' -->')) {
        console.warn('  WARNING: [' + item.id + '] Issue #' + issueNumber + ' body was modified on GitHub — backlog.md wins, overwriting.');
      }

      const titleChanged = existing.title !== title;
      const bodyChanged = existing.body !== body;

      if (titleChanged || bodyChanged) {
        console.log('  Updating issue #' + issueNumber + '...');
        await octokit.issues.update({
          owner: OWNER, repo: REPO, issue_number: issueNumber,
          title, body, labels: labelsToApply, milestone: milestoneNumber,
        });
        console.log('  Updated issue #' + issueNumber);
      } else {
        console.log('  Issue #' + issueNumber + ' is up to date — skipping');
      }

      let projectItemId = await getProjectItemId(issueNumber);
      if (!projectItemId) {
        console.log('  Issue #' + issueNumber + ' not in project yet — adding...');
        projectItemId = await addIssueToProject(issueNodeId);
      }

      const columnName = STATUS_TO_COLUMN[item.status] || 'Backlog';
      const optionId = getOptionId(columnName);
      if (optionId) {
        await moveIssueToColumn(projectItemId, statusField.id, optionId);
        console.log('  Kanban column synced to: ' + columnName);
      } else {
        console.warn('  WARNING: Column ' + columnName + ' not found in project');
      }
    }
  }

  console.log('\nSync complete.');
}

main().catch(err => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
