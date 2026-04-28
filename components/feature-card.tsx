"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  index: number;
}

export function FeatureCard({ title, description, icon, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group border border-foreground/10 p-6 hover:border-foreground/30 transition-all duration-300 bg-background"
    >
      <div className="w-12 h-12 border border-foreground/20 flex items-center justify-center mb-4 group-hover:border-foreground/40 transition-colors">
        {icon}
      </div>
      <h3 className="font-mono font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
