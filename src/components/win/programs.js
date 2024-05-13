import Notepad from "../apps/Notepad";
import ProgramManager from "../apps/ProgramManager";
import Calculator from "../apps/Calculator";
import Clock from "../apps/Clock";
import Paintbrush from "../apps/Paintbrush";
import Desk from "../apps/Desk";

export const getPrograms = () => {
	return [
	{
		progID: 0,
		title: "Program Manager",
		progName: "progman.exe", // Added name for "Notepad
		minimized: false,
		maximized: false,
		component: ProgramManager,
		icon: "💾", // You can use emojis or custom icons
		params: { _onOpenWindow: "!!handleOpenWindow" },
		initialPosition: { x: 5, y: 5, width: 365, height: 275 },
		defaultOpen: true,
		unCloseable: true,
	},
	{
		progID: 1,
		title: "Notepad",
		icon: "📝", // You can use emojis or custom icons
		progName: "notepad.exe", // Added name for "Notepad
		minimized: false,
		maximized: false,
		component: Notepad,
		initialPosition: { x: 10, y: 10, width: 380, height: 200 },
	},
	{
		progID: 2,
		title: "Calculator",
		icon: "🧮", // Example icon
		progName: "calc.exe", // Added name for "Calculator"
		component: Calculator,
	},
	{
		progID: 3,
		title: "Clock",
		icon: "⏰", // Example icon
		progName: "clock.exe", // Added name for "File Manager"
		component: Clock,
		defaultOpen: false,
	},
	{
		progID: 4,
		title: "Paintbrush",
		icon: "🎨", // Example icon
		progName: "paint.exe", // Added name for "Paintbrush"
		component: Paintbrush,
		initialPosition: { x: 1, y: 1, width: 425, height: 485 },
	},
	{
		progID: 5,
		title: "Desk",
		icon: "🖥️", // Example icon
		progName: "desk.exe", // Added name for "Paintbrush"
		component: Desk,
		initialPosition: { x: 1, y: 1, width: 425, height: 485 },
	},
	{
		progID: 6,
		title: "Money Manager",
		icon: "💰",
		progName: "winbit32.exe",
		component: Desk,
	},
];

};
