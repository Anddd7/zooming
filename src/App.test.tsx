import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './app/App';

describe('App shell', () => {
  it('renders heading and canvas editor area', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Zooming Indoor Design Tool' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('editor-canvas')).toBeInTheDocument();
  });
});
