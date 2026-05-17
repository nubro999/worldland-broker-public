'use client';

import Dither from './Dither';

export default function BackgroundTerminal() {
    return (
        <div className="absolute inset-0 w-full h-full">
            <Dither
                waveColor={[0.8, 0.2, 0.2]}
                disableAnimation={false}
                enableMouseInteraction={true}
                mouseRadius={0.2}
                colorNum={4}
                waveAmplitude={0.3}
                waveFrequency={3}
                waveSpeed={0.05}
            />
        </div>
    );
}
