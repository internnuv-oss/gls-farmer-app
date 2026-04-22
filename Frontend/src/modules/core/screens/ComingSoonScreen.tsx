import React from 'react';
import { FeedbackScreenTemplate } from '../../../design-system/templates';

type Props = { 
  onBack: () => void 
};

export const ComingSoonScreen: React.FC<Props> = ({ onBack }) => {
  return (
    <FeedbackScreenTemplate
      tone="primary"
      iconName="construction"
      animationType="spin" // Triggers the spinning gears animation
      title="Feature in Progress"
      description="We are currently forging this module in our labs. It will be rolled out soon to boost your sales efficiency!"
      primaryActionLabel="Go Back"
      onPrimaryAction={onBack}
    />
  );
};