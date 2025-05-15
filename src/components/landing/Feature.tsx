import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import { featureData } from "@/data/feature";

interface FeatureItem {
    icon: React.JSX.Element;
    title: string;
    description: string;
}

interface FeatureSection {
    title: string;
    icon: React.JSX.Element;
    heading: string;
    description: string;
    color: string;
    items: FeatureItem[];
}


export default function Feature() {
    const [data] = useAtom(featureData);
    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    const headerVariants = {
        hidden: { y: -20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", duration: 0.8 }
        }
    };

    // Reusable feature section component
    const FeatureSection = ({ data }: { data: FeatureSection }) => (
        <>
            <motion.div
                className="text-center max-w-2xl mx-auto mb-16"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={headerVariants}
            >
                <motion.div
                    className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-6 border",
                        data.color === "emerald" && "bg-emerald-50 text-emerald-600 border-emerald-200/30",
                        data.color === "blue" && "bg-blue-50 text-blue-600 border-blue-200/30"
                    )}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                >
                    {data.icon} {data.title}
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{data.heading}</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    {data.description}
                </p>
            </motion.div>

            <motion.div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 select-none ${data.title === "Free Features" ? "mb-24" : ""}`}
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
            >
                {data.items.map((feature, i) => (
                    <FeatureCard
                        key={i}
                        feature={feature}
                        colorTheme={data.color}
                        itemVariants={itemVariants}
                    />
                ))}
            </motion.div>
        </>
    );

    // Extracted feature card component for reuse
    const FeatureCard = ({
        feature,
        colorTheme,
        itemVariants
    }: {
        feature: FeatureItem;
        colorTheme: string;
        itemVariants: any;
    }) => (
        <motion.div
            className="group relative overflow-hidden rounded-xl p-6 bg-white border border-slate-100"
            variants={itemVariants}
            whileHover={{
                scale: 1.03,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                borderColor: colorTheme === "emerald"
                    ? "rgba(52, 211, 153, 0.3)" // emerald-300
                    : "rgba(59, 130, 246, 0.3)" // blue-300
            }}
        >
            <motion.div
                className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0",
                    colorTheme === "emerald" && "from-emerald-50 to-transparent",
                    colorTheme === "blue" && "from-blue-50 to-transparent"
                )}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.3 }}
            />
            <motion.div
                className={cn(
                    "p-3 rounded-xl bg-gradient-to-br w-fit mb-4 border",
                    colorTheme === "emerald" && "from-emerald-50 to-green-50 border-emerald-200/20",
                    colorTheme === "blue" && "from-blue-50 to-green-50 border-blue-200/20"
                )}
                whileHover={{ rotate: [0, -5, 5, -5, 0], transition: { duration: 0.5 } }}
            >
                {feature.icon}
            </motion.div>
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="mt-2 text-muted-foreground">
                {feature.description}
            </p>
            <motion.div
                className={cn(
                    "h-1 w-12 bg-gradient-to-r rounded-full mt-4",
                    colorTheme === "emerald" && "from-emerald-400/40 to-green-400/40",
                    colorTheme === "blue" && "from-blue-400/40 to-green-400/40"
                )}
                whileHover={{ width: "6rem" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
        </motion.div>
    );

    // Premium feature preview section component
    const PremiumFeaturePreview = () => {
        // Get first 6 premium features without modifying original array
        const previewFeatures = data.premium.previewItems.slice(0, 6);

        return (
            <>
                <motion.div
                    className="text-center max-w-2xl mx-auto mb-16"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={headerVariants}
                >
                    <motion.div
                        className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6 border border-blue-200/30"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400 }}
                    >
                        {data.premium.icon} {data.premium.title}
                    </motion.div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{data.premium.heading}</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        {data.premium.description}
                    </p>
                </motion.div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 select-none mb-12"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                >
                    {previewFeatures.map((feature, i) => (
                        <FeatureCard
                            key={i}
                            feature={feature}
                            colorTheme="blue"
                            itemVariants={itemVariants}
                        />
                    ))}
                </motion.div>

                <ActionButton />
            </>
        );
    };

    // Extracted action button component
    const ActionButton = () => (
        <motion.div
            className="text-center mt-8 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
        >
            <p className="text-muted-foreground mb-4">...and many more premium features to enhance your meetings!</p>
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Link
                    to="/features"
                    className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                    See all premium features <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
            </motion.div>
        </motion.div>
    );

    return (
        <section className="">
            <div className="container mx-auto py-24">
                {/* Free Features */}
                <FeatureSection data={data.free} />

                {/* Premium Features Preview */}
                <PremiumFeaturePreview />

                <motion.div
                    className="mt-16 text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                >
                    <motion.span
                        whileHover={{ scale: 1.1, x: 5 }}
                    >
                        <Link to="/pricing" className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 transition-colors">
                            View pricing options <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                    </motion.span>
                </motion.div>
            </div>
        </section>
    );
}