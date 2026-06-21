import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App shell', () => {
  it('renders heading and bootstrap description', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Zooming Indoor Design Tool' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bootstrap shell ready. Editor modules will be added incrementally.'),
    ).toBeInTheDocument();
  });
});
