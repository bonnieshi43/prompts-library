/*
 * This file is part of StyleBI.
 * Copyright (C) 2026  InetSoft Technology
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Readable } from 'stream';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import type { StartedDockerComposeEnvironment } from 'testcontainers';

const composeDir = path.resolve(__dirname, '../../../resources');
const DASHBOARD_URL = '/app/portal/tab/dashboard';
const EM_URL = '/em/settings/content/repository';

const containerNames = ['server-1', 'mongodb-1'];
const logCaptureIdleTimeout = 500;
const logCaptureMaxTimeout = 5_000;

let environment: StartedDockerComposeEnvironment;
let baseUrl: string;

function xpathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  if (!value.includes('"')) {
    return `"${value}"`;
  }

  return `concat('${value.replace(/'/g, `', "'", '`)}')`;
}

async function readCurrentLogs(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let done = false;
    let idleTimeout: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(idleTimeout);
      clearTimeout(maxTimeout);
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
    };

    const finish = () => {
      if (done) {
        return;
      }

      done = true;
      cleanup();
      stream.destroy();
      resolve(Buffer.concat(chunks).toString('utf8'));
    };

    const onData = (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(finish, logCaptureIdleTimeout);
    };

    const onEnd = () => finish();
    const onError = (error: Error) => {
      if (!done) {
        done = true;
        cleanup();
        reject(error);
      }
    };

    const maxTimeout = setTimeout(finish, logCaptureMaxTimeout);
    idleTimeout = setTimeout(finish, logCaptureIdleTimeout);

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });
}

async function writeContainerLogs(testInfo: TestInfo): Promise<void> {
  if (!environment) {
    return;
  }

  const outputDir = testInfo.outputPath('container-logs');
  await fs.mkdir(outputDir, { recursive: true });

  for (const containerName of containerNames) {
    const logPath = path.join(outputDir, `${containerName}.log`);

    try {
      const logs = await environment.getContainer(containerName).logs({ tail: 10_000 });
      await fs.writeFile(logPath, await readCurrentLogs(logs), 'utf8');
    }
    catch (error) {
      await fs.writeFile(
        logPath,
        `Unable to write logs for ${containerName}: ${error instanceof Error ? error.stack : error}\n`,
        'utf8'
      );
    }

    await testInfo.attach(`${containerName}.log`, {
      path: logPath,
      contentType: 'text/plain',
    });
  }
}

async function logout(page: Page, testFailed: boolean): Promise<void> {
  try {
    await page.goto('about:blank').catch(() => {});
    await page.context().request.get(baseUrl + '/logout', { failOnStatusCode: false, maxRedirects: 0 });
  }
  catch (error) {
    if (!testFailed) {
      throw error;
    }
  }
}

async function login(page: Page, url: string): Promise<void> {
  await page.goto(baseUrl + url);
  await page.getByLabel('User Name').fill('admin');
  await page.getByLabel('Password').fill('Admin1234!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(baseUrl + url);
}

function treeItem(page: Page, label: string): Locator {
  return page.locator(`.repository-tree [role="treeitem"][aria-label=${JSON.stringify(label)}]`).first();
}

function childTreeItem(node: Locator, label: string): Locator {
  return node
    .locator(`xpath=following-sibling::div[1]//div[@role="treeitem" and @aria-label=${xpathLiteral(label)}]`)
    .first();
}

async function waitForTree(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.repository-tree [role="tree"]')).toBeVisible();
  await page.locator('.tree-loading-indicator, .tree-loading-icon').waitFor({ state: 'hidden' }).catch(() => {});
}

async function expandPath(page: Page, assetPath: string): Promise<Locator> {
  const segments = assetPath.split('/').filter(Boolean);
  let node = treeItem(page, segments[0]);
  await expect(node).toBeVisible();

  for (let i = 1; i < segments.length; i += 1) {
    if ((await node.getAttribute('aria-expanded')) === 'false') {
      await node.getByRole('button', { name: /Toggle|Toggle Folder/ }).click();
      await expect(node).toHaveAttribute('aria-expanded', 'true');
    }

    node = childTreeItem(node, segments[i]);
    await expect(node).toBeVisible();
  }

  return node;
}

async function openEmRepository(page: Page): Promise<void> {
  await login(page, EM_URL);
  await waitForTree(page);
}

async function openPortal(page: Page): Promise<void> {
  await page.goto(baseUrl + DASHBOARD_URL);
  await page.waitForLoadState('networkidle');
}

function dashboardTab(page: Page, name: string): Locator {
  return page.locator('.dashboard-tabs li.tab .nav-link', { hasText: name }).first();
}

async function openDashboard(page: Page, name: string): Promise<void> {
  await openPortal(page);
  await dashboardTab(page, name).click();
  await page.waitForLoadState('networkidle');
}

async function openArrange(page: Page): Promise<Locator> {
  await page.locator('.dashboard-tab-container [title="Dashboard Configuration"]').click();
  await page.locator('.portal-dropdown [role="menuitem"]', { hasText: 'Arrange' }).click();
  const dialog = page.locator('w-standard-dialog', { hasText: 'Arrange Dashboards' });
  await expect(dialog).toBeVisible();
  return dialog;
}

function arrangeRow(dialog: Locator, name: string): Locator {
  return dialog.locator('tbody tr').filter({ has: dialog.page().locator('td', { hasText: name }) });
}

function editor(page: Page): Locator {
  return page.locator('em-repository-dashboard-settings-view');
}

async function setEnabled(page: Page, enabled: boolean): Promise<void> {
  const toggle = editor(page).locator('mat-slide-toggle');
  const input = toggle.locator('input[type="checkbox"]');

  if ((await input.isChecked()) !== enabled) {
    await toggle.click();
  }

  enabled ? await expect(input).toBeChecked() : await expect(input).not.toBeChecked();
}

async function applySettings(page: Page): Promise<void> {
  const button = page.locator('em-editor-panel').getByRole('button', { name: 'Apply' });
  await expect(button).toBeEnabled();
  await button.click();
  await page.waitForLoadState('networkidle');
}

test.describe('Dashboard Management (Security=false)', () => {
  test.beforeAll(async () => {
    environment = await new DockerComposeEnvironment(
      composeDir,
      ['compose.mongo.yaml', 'compose.filesystem.yaml', 'compose.yaml']
    )
      .withEnvironment({
        INETSOFT_LICENSE_KEY: process.env.INETSOFT_LICENSE_KEY!,
        SETUP_ASSETS_ZIP: '../browser/em/dashboard-management/dashboard-management-security-false-assets.zip',
      })
      .withWaitStrategy('server-1', Wait.forHealthCheck())
      .withStartupTimeout(120_000)
      .up();

      const host = environment.getContainer('server-1').getHost();
      const port = environment.getContainer('server-1').getMappedPort(8080);
      baseUrl = `http://${host}:${port}`;
  });

  test.afterAll(async () => {
    if (environment) {
      await environment.down();
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    const failed = testInfo.status !== testInfo.expectedStatus;
    await logout(page, failed);

    if (failed) {
      await writeContainerLogs(testInfo);
    }
  });

  test('Default storage location for User Dashboard when security=false', async ({ page }) => {
    const timestamp = Date.now();
    const dashboardName = `Anon Dashboard ${timestamp}`;
     
    await openPortal(page);

    await page.locator('.dashboard-tab-container [title="Dashboard Configuration"]').click();
    await page.locator('.portal-dropdown [role="menuitem"]', { hasText: 'Add' }).click();

    const dialog = page.locator('w-standard-dialog', { hasText: 'New Pin' });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/Dashboard Name/i).fill(dashboardName);

    const dashboardTestNode = dialog.getByRole('treeitem', { name: /^DashboardTest$/ });
    await dashboardTestNode.click();

    const publicVsNode = dashboardTestNode.locator(
      'xpath=following-sibling::div[1]//div[@role="treeitem" and @aria-label="Public VS"]'
    );
    await expect(publicVsNode).toBeVisible();
    await publicVsNode.click();

    await dialog.getByRole('button', { name: 'OK' }).click();

    await openEmRepository(page);
    const anonymousFolder = await expandPath(page, 'User Dashboard/anonymous');
    await expect(childTreeItem(anonymousFolder, dashboardName)).toBeVisible();
  });

  test('Enabled checkbox controls Portal visibility when security=false', async ({ page }) => {
    await openEmRepository(page);
    const portal = await expandPath(page, 'Portal Dashboard');
    const dashNode = childTreeItem(portal, 'Public Toggle Dashboard');
    await expect(dashNode).toBeVisible();
    await dashNode.click();
    await expect(editor(page)).toBeVisible();

    await setEnabled(page, false);
    await applySettings(page);

    await openPortal(page);
    await expect(dashboardTab(page, 'Public Toggle Dashboard')).toBeHidden();
    await expect(arrangeRow(await openArrange(page), 'Public Toggle Dashboard')).toBeHidden();

    await openEmRepository(page);
    const portal2 = await expandPath(page, 'Portal Dashboard');
    const dashNode2 = childTreeItem(portal2, 'Public Toggle Dashboard');
    await dashNode2.click();
    await setEnabled(page, true);
    await applySettings(page);

    await openDashboard(page, 'Public Toggle Dashboard');
    await expect(dashboardTab(page, 'Public Toggle Dashboard')).toBeVisible();
    await expect(page.locator('.dashboard-container')).toContainText('Public VS Content');
  });
});
