import Notepad from "../apps/Notepad";
import ProgramManager from "../apps/ProgramManager";
import Calculator from "../apps/Calculator";
import Clock from "../apps/Clock";
import Paintbrush from "../apps/Paintbrush";

const programs =  [
				{
					progID: 0,
					title: "Program Manager",
					progName: "progman.exe", // Added name for "Notepad
					minimized: false,
					maximized: false,
					component: ProgramManager,
					params: { onOpenWindow: "!!handleOpenWindow" },
					initialPosition: { x: 0, y: 0, width: 350, height: 200 },
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
				},
				{
					progID: 4,
					title: "Paintbrush",
					icon: "🎨", // Example icon
					progName: "paint.exe", // Added name for "Paintbrush"
					component: Paintbrush,
					initialPosition: { x: 1, y: 1, width: 425, height: 485 },
				},
			];
		


export default programs;
