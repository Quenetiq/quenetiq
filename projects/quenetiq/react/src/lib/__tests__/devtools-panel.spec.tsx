import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { QueryLogEntry } from '@quenetiq/client';
import { DevToolsPanel } from '../devtools-panel';

function makeEntry(overrides: Partial<QueryLogEntry> = {}): QueryLogEntry {
  return {
    id: 1,
    timestamp: Date.now(),
    type: 'query',
    operationName: 'GetUser',
    query: 'query GetUser { user { id name } }',
    variables: { id: '1' },
    durationMs: 42,
    status: 'success',
    fromCache: false,
    size: 128,
    ...overrides,
  };
}

const defaultProps = {
  getLog: vi.fn().mockReturnValue([]),
  clearLog: vi.fn(),
};

describe('DevToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toggle button', () => {
    it('renders toggle button with QL label when closed', () => {
      render(<DevToolsPanel {...defaultProps} />);
      expect(screen.getByText('QL')).toBeDefined();
    });

    it('renders toggle button with X label when opened', () => {
      render(<DevToolsPanel {...defaultProps} isOpen={true} />);
      expect(screen.getByText('X')).toBeDefined();
    });

    it('toggles open on click (uncontrolled)', () => {
      render(<DevToolsPanel {...defaultProps} />);
      expect(screen.queryByText('Quenetiq DevTools')).toBeNull();

      fireEvent.click(screen.getByText('QL'));
      expect(screen.getByText('Quenetiq DevTools')).toBeDefined();
      expect(screen.getByText('X')).toBeDefined();

      fireEvent.click(screen.getByText('X'));
      expect(screen.queryByText('Quenetiq DevTools')).toBeNull();
    });

    it('calls onToggle with open state on click', () => {
      const onToggle = vi.fn();
      render(<DevToolsPanel {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('QL'));
      expect(onToggle).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByText('X'));
      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('controlled mode', () => {
    it('uses isOpen prop to control visibility', () => {
      const { rerender } = render(<DevToolsPanel {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Quenetiq DevTools')).toBeNull();

      rerender(<DevToolsPanel {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Quenetiq DevTools')).toBeDefined();
    });

    it('still calls onToggle in controlled mode', () => {
      const onToggle = vi.fn();
      render(<DevToolsPanel {...defaultProps} isOpen={false} onToggle={onToggle} />);

      fireEvent.click(screen.getByText('QL'));
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('log entries', () => {
    it('shows "No queries yet" when log is empty', () => {
      render(<DevToolsPanel {...defaultProps} isOpen={true} />);
      expect(screen.getByText('No queries yet')).toBeDefined();
    });

    it('displays entries from getLog', () => {
      const entry = makeEntry({ operationName: 'GetUser' });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('GetUser')).toBeDefined();
    });

    it('displays query truncated when no operationName', () => {
      const entry = makeEntry({ operationName: undefined, query: 'query { veryLongQueryString }' });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('query { veryLongQueryString }')).toBeDefined();
    });

    it('shows CACHE badge for cached entries', () => {
      const entry = makeEntry({ fromCache: true });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('CACHE')).toBeDefined();
    });

    it('does not show CACHE badge for non-cached entries', () => {
      const entry = makeEntry({ fromCache: false });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.queryByText('CACHE')).toBeNull();
    });

    it('shows MUT badge for mutation entries', () => {
      const entry = makeEntry({ type: 'mutation', operationName: 'CreateUser' });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('MUT')).toBeDefined();
    });

    it('shows QRY badge for query entries', () => {
      const entry = makeEntry({ type: 'query' });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('QRY')).toBeDefined();
    });

    it('calls clearLog when Clear button is clicked', () => {
      const clearLog = vi.fn();
      render(<DevToolsPanel {...defaultProps} clearLog={clearLog} isOpen={true} />);
      fireEvent.click(screen.getByText('Clear'));
      expect(clearLog).toHaveBeenCalledOnce();
    });
  });

  describe('entry selection', () => {
    it('shows entry details on click and hides on second click', () => {
      const entry = makeEntry({
        operationName: 'GetUser',
        status: 'success',
        durationMs: 42,
        size: 256,
        query: 'query GetUser { user { id name } }',
        variables: { id: '1' },
      });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);

      // Click to expand
      fireEvent.click(screen.getByText('GetUser'));
      expect(screen.getByText(/Type:/)).toBeDefined();
      expect(screen.getByText(/Status:/)).toBeDefined();
      expect(screen.getByText(/Duration:/)).toBeDefined();
      expect(screen.getByText(/Size:/)).toBeDefined();
      expect(screen.getByText(/Query:/)).toBeDefined();
      expect(screen.getByText(/Variables:/)).toBeDefined();

      // Click again to collapse
      fireEvent.click(screen.getByText('GetUser'));
      expect(screen.queryByText(/Variables:/)).toBeNull();
    });

    it('shows error text in details when entry has error', () => {
      const entry = makeEntry({
        status: 'error',
        error: 'Something went wrong',
      });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);

      fireEvent.click(screen.getByText(entry.operationName!));
      expect(screen.getByText(/Error: Something went wrong/)).toBeDefined();
    });

    it('does not show Variables section when variables is undefined', () => {
      const entry = makeEntry({ variables: undefined });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);

      fireEvent.click(screen.getByText(entry.operationName!));
      expect(screen.queryByText(/Variables:/)).toBeNull();
    });
  });

  describe('filter', () => {
    it('filters to queries only', () => {
      const queryEntry = makeEntry({ id: 1, type: 'query', operationName: 'GetUser' });
      const mutationEntry = makeEntry({ id: 2, type: 'mutation', operationName: 'CreateUser' });
      const getLog = vi.fn().mockReturnValue([queryEntry, mutationEntry]);

      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('GetUser')).toBeDefined();
      expect(screen.getByText('CreateUser')).toBeDefined();

      fireEvent.change(screen.getByDisplayValue('All'), { target: { value: 'query' } });
      expect(screen.getByText('GetUser')).toBeDefined();
      expect(screen.queryByText('CreateUser')).toBeNull();
    });

    it('filters to mutations only', () => {
      const queryEntry = makeEntry({ id: 1, type: 'query', operationName: 'GetUser' });
      const mutationEntry = makeEntry({ id: 2, type: 'mutation', operationName: 'CreateUser' });
      const getLog = vi.fn().mockReturnValue([queryEntry, mutationEntry]);

      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      fireEvent.change(screen.getByDisplayValue('All'), { target: { value: 'mutation' } });
      expect(screen.queryByText('GetUser')).toBeNull();
      expect(screen.getByText('CreateUser')).toBeDefined();
    });

    it('shows all entries when filter is All', () => {
      const queryEntry = makeEntry({ id: 1, type: 'query', operationName: 'GetUser' });
      const mutationEntry = makeEntry({ id: 2, type: 'mutation', operationName: 'CreateUser' });
      const getLog = vi.fn().mockReturnValue([queryEntry, mutationEntry]);

      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      fireEvent.change(screen.getByDisplayValue('All'), { target: { value: 'query' } });
      fireEvent.change(screen.getByDisplayValue('Queries'), { target: { value: 'all' } });
      expect(screen.getByText('GetUser')).toBeDefined();
      expect(screen.getByText('CreateUser')).toBeDefined();
    });
  });

  describe('maxEntries', () => {
    it('limits displayed entries to maxEntries', () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        makeEntry({ id: i + 1, operationName: `Query${i + 1}` }),
      );
      const getLog = vi.fn().mockReturnValue(entries);

      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} maxEntries={3} />);
      expect(screen.getByText('Query1')).toBeDefined();
      expect(screen.getByText('Query3')).toBeDefined();
      expect(screen.queryByText('Query4')).toBeNull();
    });
  });

  describe('position', () => {
    it('renders without crashing with different positions', () => {
      for (const pos of ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const) {
        const { unmount } = render(
          <DevToolsPanel {...defaultProps} position={pos} isOpen={true} />,
        );
        expect(screen.getByText('Quenetiq DevTools')).toBeDefined();
        unmount();
      }
    });
  });

  describe('formatting helpers', () => {
    it('formats duration <1ms', () => {
      const entry = makeEntry({ durationMs: 0.5 });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('<1ms')).toBeDefined();
    });

    it('formats duration in ms', () => {
      const entry = makeEntry({ durationMs: 42 });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('42ms')).toBeDefined();
    });

    it('formats duration in seconds', () => {
      const entry = makeEntry({ durationMs: 2500 });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);
      expect(screen.getByText('2.50s')).toBeDefined();
    });

    it('formats size in bytes', () => {
      const entry = makeEntry({ size: 512 });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);

      fireEvent.click(screen.getByText(entry.operationName!));
      expect(screen.getByText('512B')).toBeDefined();
    });

    it('formats size in KB', () => {
      const entry = makeEntry({ size: 2048 });
      const getLog = vi.fn().mockReturnValue([entry]);
      render(<DevToolsPanel {...defaultProps} getLog={getLog} isOpen={true} />);

      fireEvent.click(screen.getByText(entry.operationName!));
      expect(screen.getByText('2.0KB')).toBeDefined();
    });
  });
});
