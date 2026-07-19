'use client';

import {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';

const ReactLoading = ({
  color = '#fff',
  width = 20,
  height = 20,
}: {
  type?: string;
  color?: string;
  width?: number;
  height?: number;
}) => {
  const size = Math.min(width, height);
  const borderWidth = Math.max(2, Math.round(size / 8));
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `${borderWidth}px solid transparent`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
};

export const Button: FC<
  DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & {
    secondary?: boolean;
    loading?: boolean;
    innerClassName?: string;
  }
> = ({ children, loading, innerClassName, secondary, ...props }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    setHeight(ref.current?.offsetHeight || 40);
  }, []);
  return (
    <button
      {...props}
      type={props.type || 'button'}
      ref={ref}
      className={clsx(
        (props.disabled || loading) && 'opacity-40 pointer-events-none',
        'px-[20px] h-[40px] cursor-pointer items-center justify-center flex relative',
        'rounded-[10px] text-[14px] font-[600] tracking-[-0.01em]',
        'transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        'active:scale-[0.98]',
        secondary
          ? 'bg-newBgColorInner text-newTextColor border border-newTableBorder hover:bg-boxHover hover:border-[color:var(--cf-line-strong,#d6d3d1)] hover:shadow-cfSm'
          : 'bg-btnPrimary text-white hover:brightness-[0.92] hover:shadow-cfAccent active:brightness-[100]',
        props?.className
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ReactLoading
            type="spin"
            color={secondary ? '#b4530a' : '#fff'}
            width={height! / 2}
            height={height! / 2}
          />
        </div>
      )}
      <div
        className={clsx(
          innerClassName,
          'flex-1 items-center justify-center flex',
          loading && 'invisible'
        )}
      >
        {children}
      </div>
    </button>
  );
};
