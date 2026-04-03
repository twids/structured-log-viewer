// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { StatusBar } from '../../webview/statusbar';

describe('StatusBar', () => {
  let container: HTMLElement;
  let statusBar: StatusBar;

  beforeEach(() => {
    container = document.createElement('div');
    statusBar = new StatusBar(container);
  });

  it('renders entry counts with commas', () => {
    statusBar.update({
      shownCount: 1234,
      totalCount: 5678,
      loadedCount: 5678,
      templateName: 'Serilog Compact (CLEF)',
      isLive: false,
      isLoading: false,
    });
    expect(container.textContent).toContain('1,234');
    expect(container.textContent).toContain('5,678');
  });

  it('shows template name', () => {
    statusBar.update({
      shownCount: 10,
      totalCount: 20,
      loadedCount: 20,
      templateName: 'Serilog JSON',
      isLive: false,
      isLoading: false,
    });
    expect(container.textContent).toContain('Serilog JSON');
  });

  it('shows Live indicator when isLive', () => {
    statusBar.update({
      shownCount: 10,
      totalCount: 20,
      loadedCount: 20,
      templateName: 'Test',
      isLive: true,
      isLoading: false,
    });
    expect(container.textContent).toContain('Live');
    const liveSpan = container.querySelector('.status-live');
    expect(liveSpan).not.toBeNull();
  });

  it('shows Loading indicator when isLoading', () => {
    statusBar.update({
      shownCount: 10,
      totalCount: 20,
      loadedCount: 20,
      templateName: 'Test',
      isLive: false,
      isLoading: true,
    });
    expect(container.textContent).toContain('Loading');
    const loadingSpan = container.querySelector('.status-loading');
    expect(loadingSpan).not.toBeNull();
  });

  it('updates when called multiple times', () => {
    statusBar.update({
      shownCount: 5,
      totalCount: 10,
      loadedCount: 10,
      templateName: 'First',
      isLive: false,
      isLoading: false,
    });
    expect(container.textContent).toContain('First');

    statusBar.update({
      shownCount: 100,
      totalCount: 200,
      loadedCount: 200,
      templateName: 'Second',
      isLive: true,
      isLoading: false,
    });
    expect(container.textContent).toContain('Second');
    expect(container.textContent).toContain('200');
    expect(container.textContent).not.toContain('First');
  });

  it('shows loaded vs total when loadedCount < totalCount', () => {
    statusBar.update({
      shownCount: 50,
      totalCount: 1000,
      loadedCount: 200,
      templateName: 'Test',
      isLive: false,
      isLoading: false,
    });
    expect(container.textContent).toContain('50');
    expect(container.textContent).toContain('1,000');
  });

  it('does not show Live when isLive is false', () => {
    statusBar.update({
      shownCount: 10,
      totalCount: 20,
      loadedCount: 20,
      templateName: 'Test',
      isLive: false,
      isLoading: false,
    });
    expect(container.querySelector('.status-live')).toBeNull();
  });

  it('destroy removes content from container', () => {
    statusBar.update({
      shownCount: 10,
      totalCount: 20,
      loadedCount: 20,
      templateName: 'Test',
      isLive: false,
      isLoading: false,
    });
    expect(container.children.length).toBeGreaterThan(0);
    statusBar.destroy();
    expect(container.innerHTML).toBe('');
  });
});
