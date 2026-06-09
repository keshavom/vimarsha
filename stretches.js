/* Post-meditation stretches with inline SVG tutorials.
   SVGs are self-contained line illustrations so they render offline and on any device. */
(function (global) {
  const S = (inner) =>
    `<svg viewBox="0 0 240 190" role="img" aria-hidden="true" fill="none"
       stroke="#6f6257" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
       <line x1="20" y1="168" x2="220" y2="168" stroke="#cdbba3" stroke-width="3" />
       ${inner}</svg>`;

  const ACCENT = '#e0633a';

  const NECK = S(`
    <circle cx="120" cy="52" r="22" />
    <path d="M120 74 L120 138" />
    <path d="M120 90 L150 78" />
    <path d="M120 96 L94 120 L98 150" />
    <path d="M120 138 L104 168 M120 138 L138 168" />
    <path d="M138 44 q14 6 14 22" stroke="${ACCENT}" stroke-width="3" />
    <path d="M150 64 l4 4 m-4 -4 l5 -2" stroke="${ACCENT}" stroke-width="2.6" />`);

  const SHOULDER = S(`
    <circle cx="120" cy="50" r="21" />
    <path d="M120 71 L120 140" />
    <path d="M120 86 L92 104 M120 86 L148 104" />
    <path d="M120 140 L104 168 M120 140 L138 168" />
    <path d="M92 78 a14 14 0 1 1 -2 14" stroke="${ACCENT}" stroke-width="2.8" />
    <path d="M88 64 l3 5 6 -2" stroke="${ACCENT}" stroke-width="2.6" />
    <path d="M148 78 a14 14 0 1 0 2 14" stroke="${ACCENT}" stroke-width="2.8" />
    <path d="M152 64 l-3 5 -6 -2" stroke="${ACCENT}" stroke-width="2.6" />`);

  const TWIST = S(`
    <path d="M70 168 L150 168" stroke="#5a63a8" />
    <circle cx="118" cy="58" r="21" />
    <path d="M118 79 Q150 96 150 120" />
    <path d="M150 120 L96 150 L150 150" />
    <path d="M118 92 L150 86" stroke="${ACCENT}" />
    <path d="M118 96 L86 110" />
    <path d="M150 86 l-7 -3 m7 3 l-3 7" stroke="${ACCENT}" stroke-width="2.6" />`);

  const CATCOW = S(`
    <path d="M62 150 Q120 96 178 150" />
    <circle cx="58" cy="120" r="17" />
    <path d="M70 132 L70 168 M88 142 L88 168" />
    <path d="M170 138 L170 168 M186 132 L186 168" />
    <path d="M120 104 q0 -16 0 -20" stroke="${ACCENT}" stroke-width="2.8" />
    <path d="M114 90 l6 -8 6 8" stroke="${ACCENT}" stroke-width="2.6" />`);

  const CHILD = S(`
    <path d="M60 168 Q120 156 150 150" />
    <circle cx="62" cy="146" r="16" />
    <path d="M150 150 Q176 146 176 120 L176 168" />
    <path d="M150 150 L96 168" />
    <path d="M78 150 L150 150" />
    <path d="M150 150 L196 138" stroke="${ACCENT}" />`);

  const FOLD = S(`
    <circle cx="120" cy="150" r="18" />
    <path d="M120 132 Q150 96 150 56" />
    <path d="M150 56 L150 26" stroke="${ACCENT}" />
    <path d="M150 132 L150 168" />
    <path d="M132 142 L120 168" />
    <path d="M120 132 L100 162" />
    <path d="M144 30 l6 -6 6 6" stroke="${ACCENT}" stroke-width="2.6" />`);

  const SEATED = S(`
    <circle cx="120" cy="50" r="21" />
    <path d="M120 71 L120 132" />
    <path d="M120 86 L92 150 M120 86 L148 150" />
    <path d="M120 132 L150 120" stroke="${ACCENT}" />
    <path d="M120 96 L90 84" />
    <path d="M150 120 l-2 -8 m2 8 l-8 0" stroke="${ACCENT}" stroke-width="2.6" />`);

  global.STRETCHES = [
    {
      name: 'Gentle Neck Release',
      duration: '30s each side',
      target: 'Neck · upper traps',
      svg: NECK,
      steps: [
        'Sit tall, shoulders relaxed and down.',
        'Drop your right ear toward your right shoulder.',
        'Rest your right hand lightly on your head — no pulling.',
        'Breathe slowly, then switch sides.',
      ],
    },
    {
      name: 'Shoulder Rolls',
      duration: '10 rolls each way',
      target: 'Shoulders · upper back',
      svg: SHOULDER,
      steps: [
        'Sit or stand with arms loose at your sides.',
        'Lift both shoulders up toward your ears.',
        'Roll them back and down in a slow circle.',
        'Reverse the direction after 10 rolls.',
      ],
    },
    {
      name: 'Seated Spinal Twist',
      duration: '30s each side',
      target: 'Spine · obliques',
      svg: TWIST,
      steps: [
        'Sit cross-legged or on a chair, spine long.',
        'Place your right hand behind you, left on right knee.',
        'Inhale to lengthen, exhale to twist gently right.',
        'Look over your shoulder, then unwind and switch.',
      ],
    },
    {
      name: 'Cat–Cow',
      duration: '6–8 slow rounds',
      target: 'Spine · core',
      svg: CATCOW,
      steps: [
        'Come to hands and knees, wrists under shoulders.',
        'Inhale: drop the belly, lift chest and tailbone (cow).',
        'Exhale: round the spine, tuck chin and tailbone (cat).',
        'Move with your breath, slow and fluid.',
      ],
    },
    {
      name: "Child's Pose",
      duration: '60–90 seconds',
      target: 'Lower back · hips',
      svg: CHILD,
      steps: [
        'Kneel and sit back toward your heels.',
        'Fold forward, resting your forehead on the floor.',
        'Stretch your arms ahead or rest them by your sides.',
        'Let each exhale soften your lower back.',
      ],
    },
    {
      name: 'Standing Forward Fold',
      duration: '45 seconds',
      target: 'Hamstrings · back',
      svg: FOLD,
      steps: [
        'Stand tall, feet hip-width apart.',
        'Hinge at the hips and fold forward, knees soft.',
        'Let your head and arms hang heavy.',
        'Roll up slowly, one vertebra at a time.',
      ],
    },
    {
      name: 'Seated Side Reach',
      duration: '30s each side',
      target: 'Side body · ribs',
      svg: SEATED,
      steps: [
        'Sit comfortably, both sitting bones grounded.',
        'Plant your left hand on the floor beside you.',
        'Sweep your right arm up and over toward the left.',
        'Feel the stretch along your right side, then switch.',
      ],
    },
  ];
})(window);
