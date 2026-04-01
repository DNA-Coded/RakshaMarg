import React from 'react';
import { Shield, Heart, Zap, Users, Target, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Shield,
    title: 'Nivriti Panday',
    description: 'Predictive algorithms analyze historical data to flag unsafe zones before you enter them.',
    className: "md:col-span-2 md:row-span-1 bg-gradient-to-br from-brand-purple/20 to-brand-dark border-brand-purple/20",
    iconClass: "text-brand-purple"
  },
  {
    icon: Zap,
    title: 'Live Sync',
    description: 'Real-time updates.',
    className: "md:col-span-1 md:row-span-1 bg-brand-dark border-white/5",
    iconClass: "text-brand-teal"
  },
  {
    icon: Target,
    title: 'Precision Data',
    description: 'Street-level lighting and crowd density visualization.',

    className: "md:col-span-1 md:row-span-1 bg-brand-teal/10 border-brand-teal/20",
    iconClass: "text-brand-teal"
  },
  {
    icon: Users,
    title: 'Crowd Source',
    description: 'Community-verified safety reports ensure you never walk alone.',
    className: "md:col-span-2 lg:col-span-2 md:row-span-1 bg-brand-dark border-white/5",
    iconClass: "text-white"
  },
];

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  className: string;
  iconClass: string;
}

const BentoCard = ({ feature, index }: { feature: Feature, index: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)" }}
    className={cn(
      "group relative p-8 rounded-3xl overflow-hidden backdrop-blur-sm border transition-colors duration-300 flex flex-col justify-between",
      feature.className
    )}
  >
    <div className="relative z-10">
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-white/5 backdrop-blur-md border border-white/10")}>
        <feature.icon className={cn("w-6 h-6", feature.iconClass)} />
      </div>
      <h3 className="font-display text-xl font-bold mb-2 text-white">{feature.title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
    </div>

    { }
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  </motion.div>
);

const WhySection = () => {
  return (
    <section className="py-32 bg-brand-dark relative">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">Why RakshaMarg?</h2>
          <p className="text-white/50 text-lg">Built for the modern night.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[250px]">
          {features.map((feature, index) => (
            <BentoCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySection;