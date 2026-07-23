import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationButton } from './NavigationButton';
import { type Swiper as SwiperClass } from 'swiper';

const makeSwiper = () =>
  ({
    slidePrev: vi.fn(),
    slideNext: vi.fn(),
  }) as unknown as SwiperClass;

describe('NavigationButton', () => {
  it('renders an empty placeholder when disabled, to keep the layout stable', () => {
    const { container } = render(
      <NavigationButton direction="prev" disabled swiper={makeSwiper()} />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass('h-8', 'w-8');
  });

  it('renders an empty placeholder when the swiper is not ready yet', () => {
    render(<NavigationButton direction="next" disabled={false} swiper={null} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('slides to the previous day', () => {
    const swiper = makeSwiper();
    render(<NavigationButton direction="prev" disabled={false} swiper={swiper} />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(swiper.slidePrev).toHaveBeenCalledTimes(1);
    expect(swiper.slideNext).not.toHaveBeenCalled();
  });

  it('slides to the next day', () => {
    const swiper = makeSwiper();
    render(<NavigationButton direction="next" disabled={false} swiper={swiper} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    expect(swiper.slideNext).toHaveBeenCalledTimes(1);
  });
});
