import Notepad from "../apps/Notepad";
import ProgramManager from "../apps/ProgramManager";
import Calculator from "../apps/Calculator";
import Clock from "../apps/Clock";
import Paintbrush from "../apps/Paintbrush";
import Desk from "../apps/Desk";
import Winbit32 from "../apps/winbit32/Winbit32";
import Portfolio from "../apps/winbit32/Portfolio";
import IRCWindow from "../apps//winbit32/mirc/IRCWindow";
import ChannelList from "../apps/winbit32/mirc/ChannelList";
import MessagePanel from "../apps/winbit32/mirc/MessagePanel";
import SwapComponent from "../apps/winbit32/SwapComponent";
import SendFundsComponent from "../apps/winbit32/SendFundsComponent";
import SecTools from "../apps/sectools/SecTools";
import Split from "../apps/sectools/Split";
import Unsplit from "../apps/sectools/Unsplit";
import ViewQR from "../apps/winbit32/ViewQR";
import ReadQR from "../apps/winbit32/ReadQR";
import PhraseHunter from "../apps/sectools/PhraseHunter";
import NFTPurchasingComponent from "../apps/winbit32/mnft/NFTPurchasingComponent";


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
			initialPosition: { x: 5, y: 5, width: 350, height: 275, smHeight: 275 },
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
			initialPosition: { x: 1, y: 1, width: 250, height: 250, smHeight: 250 },
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
			menuOnly: true,
			menuLabel: "New Desk...",
		},
		{
			progID: 6,
			title: "Security Tools",
			icon: "🔒",
			progName: "sectools.exe",
			component: SecTools,
			maximized: true,
			//isContainer: true,
			programs: [
				{
					progID: 0,
					title: "Split",
					icon: "💼", // Example icon
					progName: "split.exe", // Added name for "Calculator"
					component: Split,
					maximized: true,
				},
				{
					progID: 1,
					title: "Unsplit",
					icon: "🔄",
					progName: "unsplit.exe", // Added name for "File Manager"
					component: Unsplit,
					defaultOpen: false,
					initialPosition: {
						x: "auto",
						y: 0,
						width: 375,
						height: 650,
						smHeight: 350,
					},
				},
				{
					progID: 1,
					title: "Hunter",
					icon: "🕵",
					progName: "phunter.exe",
					component: PhraseHunter,
					defaultOpen: false,
					initialPosition: {
						x: "auto",
						y: 0,
						width: 375,
						height: 650,
						smHeight: 350,
					},
				},
				{
					progID: 2,
					title: "Open with...",
					icon: "💰",
					progName: "winbit32.exe",
					openLevel: -1,
					addProgramData: ["phrase"],
				},
			],
		},

		{
			progID: 7,
			title: "Money Manager",
			icon: "💰",
			progName: "winbit32.exe",
			component: Winbit32,
			maximized: true,
			//isContainer: true,
			programs: [
				{
					progID: 0,
					title: "Portfolio",
					icon: "💼", // Example icon
					progName: "portfolio.exe", // Added name for "Calculator"
					component: Portfolio,
					maximized: true,
				},
				{
					progID: 1,
					title: "Exchange",
					icon: "🔄",
					progName: "exchange.exe", // Added name for "File Manager"
					component: SwapComponent,
					defaultOpen: false,
					initialPosition: {
						x: "auto",
						y: 0,
						width: 375,
						height: 650,
						smHeight: 350,
					},
				},
				{
					progID: 2,
					title: "Send",
					icon: "✉️",
					progName: "send.exe", // Added name for "Paintbrush"
					component: SendFundsComponent,
					initialPosition: {
						x: 1,
						y: 1,
						width: 425,
						height: 550,
						smHeight: 350,
					},
				},

				{
					progID: 4,
					title: "mayaNFT",
					icon: "📇",
					progName: "mnft.exe", // Added name for "Paintbrush"
					component: NFTPurchasingComponent,
					maximized: true,
				},
				{
					progID: 4,
					title: "View Master Seed",
					icon: "💰",
					hideInToolbar: true,
					progName: "viewqr.exe", // Added name for "Paintbrush"
					component: ViewQR,
					addProgramData: ["phrase"],
					initialPosition: {
						x: 1,
						y: 1,
						width: 355,
						height: 285,
					},
				},
				{
					progID: 4,
					title: "Read Master Seed",
					icon: "💰",
					hideInToolbar: true,
					progName: "readqr.exe", // Added name for "Paintbrush"
					component: ReadQR,
					addProgramData: ["setPhrase", "setStatusMessage"],
					initialPosition: {
						x: 1,
						y: 1,
						width: 325,
						height: 325,
					},
				},
			],
		},
	];

};
