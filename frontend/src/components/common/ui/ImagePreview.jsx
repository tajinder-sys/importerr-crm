import { useState, useRef } from 'react';

const ImagePreview = ({
  src,
  alt = '',
  className = '',
  thumbnailClassName = '',
  hoverPreview = false,
  previewSize = 200,
  fallbackIcon = null,
}) => {
  const [hovered, setHovered] = useState(false);
  const [previewStyle, setPreviewStyle] = useState({});
  const containerRef = useRef(null);

  const handleMouseEnter = () => {
    if (!hoverPreview || !src) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const half = previewSize / 2;

      // Horizontal: prefer right, fallback left
      let left;
      if (spaceRight >= previewSize + 12) {
        left = rect.right + 12;
      } else if (spaceLeft >= previewSize + 12) {
        left = rect.left - previewSize - 12;
      } else {
        left = Math.max(8, rect.left + rect.width / 2 - half);
      }

      // Vertical: center on thumbnail, clamp to viewport
      let top = rect.top + rect.height / 2 - half;
      top = Math.max(8, Math.min(top, window.innerHeight - previewSize - 8));

      setPreviewStyle({ top, left });
    }

    setHovered(true);
  };

  const handleMouseLeave = () => setHovered(false);

  const Fallback = () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
      {fallbackIcon || (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 3v18" />
        </svg>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={containerRef}
        className={`relative inline-flex items-center justify-center overflow-hidden cursor-pointer ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-contain ${thumbnailClassName}`}
          />
        ) : (
          <Fallback />
        )}

        {hoverPreview && src && (
          <div
            className={`absolute inset-0 rounded-[inherit] ring-2 ring-indigo-400 ring-offset-1 transition-opacity duration-150 ${
              hovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>

      {hoverPreview && src && hovered && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: previewStyle.top,
            left: previewStyle.left,
            width: previewSize,
            height: previewSize,
          }}
        >
          <div className="w-full h-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center p-2">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImagePreview;