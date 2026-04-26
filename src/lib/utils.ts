import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithoutChildrenOrChild<T> = T extends { children: any }
	? Omit<T, "children">
	: T extends { child: any }
	? Omit<T, "child">
	: T;
