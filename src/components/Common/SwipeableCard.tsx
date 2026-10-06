import React, { useState, useRef } from 'react';
import { CheckCircle2, Edit3 } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  rightLabel?: string;
  rightIcon?: React.ReactNode;
  onSwipeLeft?: () => void;
  leftLabel?: string;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeRight,
  rightLabel = 'Baixar',
  rightIcon = <CheckCircle2 className="w-5 h-5 text-white" />,
  onSwipeLeft,
  leftLabel = 'Editar',
  leftIcon = <Edit3 className="w-5 h-5 text-white" />,
  disabled = false,
  className = ''
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || (!onSwipeRight && !onSwipeLeft)) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isHorizontalRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    // Detecta intenção de rolagem vertical vs gesto horizontal
    if (isHorizontalRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (!isHorizontalRef.current) {
      // Usuário está rolando verticalmente a lista
      return;
    }

    // Limita o deslocamento e aplica resistência
    if (diffX > 0 && !onSwipeRight) return;
    if (diffX < 0 && !onSwipeLeft) return;

    // Amortecimento
    const maxSwipe = 110;
    const clamped = Math.sign(diffX) * Math.min(Math.abs(diffX), maxSwipe);
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const triggerThreshold = 70;

    if (offsetX >= triggerThreshold && onSwipeRight) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(35); } catch {}
      }
      onSwipeRight();
    } else if (offsetX <= -triggerThreshold && onSwipeLeft) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(35); } catch {}
      }
      onSwipeLeft();
    }

    setOffsetX(0);
    isHorizontalRef.current = null;
  };

  return (
    <div className={`relative overflow-hidden rounded-xl select-none ${className}`}>
      {/* Fundo Revelado no Swipe para a Direita (Ação de Baixa/Quitação) */}
      {onSwipeRight && offsetX > 15 && (
        <div 
          className="absolute inset-y-0 left-0 flex items-center pl-4 bg-emerald-600 text-white font-bold text-xs tracking-wider uppercase transition-opacity"
          style={{ width: `${Math.max(offsetX, 0)}px` }}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {rightIcon}
            <span className="text-[11px] font-extrabold">{rightLabel}</span>
          </div>
        </div>
      )}

      {/* Fundo Revelado no Swipe para a Esquerda (Ação de Edição) */}
      {onSwipeLeft && offsetX < -15 && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-blue-600 text-white font-bold text-xs tracking-wider uppercase transition-opacity"
          style={{ width: `${Math.max(-offsetX, 0)}px` }}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[11px] font-extrabold">{leftLabel}</span>
            {leftIcon}
          </div>
        </div>
      )}

      {/* Card Principal Interativo */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        className="w-full h-full"
      >
        {children}
      </div>
    </div>
  );
};
