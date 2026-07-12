import {
  Fish, KeyRound, Smartphone, Briefcase, Gift, TrendingUp, MonitorX, Users,
  ShoppingCart, QrCode, CreditCard, Lock, ShieldCheck, Globe, Mail, Landmark,
  UserCog, Wifi, RefreshCw, DatabaseBackup, Shield, AlertTriangle,
} from "lucide-react";

const map = {
  Fish, KeyRound, Smartphone, Briefcase, Gift, TrendingUp, MonitorX, Users,
  ShoppingCart, QrCode, CreditCard, Lock, ShieldCheck, Globe, Mail, Landmark,
  UserCog, Wifi, RefreshCw, DatabaseBackup, Shield, AlertTriangle,
};

export const getIcon = (name) => map[name] || AlertTriangle;
