import Notepad from "../apps/Notepad";
import ProgramManager from "../apps/ProgramManager";
import Calculator from "../apps/Calculator";
import Clock from "../apps/Clock";
import Paintbrush from "../apps/Paintbrush";
import Desk from "../apps/Desk";
import Winbit32 from "../apps/Winbit32";
import Portfolio from "../apps/Portfolio";
import IRCWindow from "../apps/mirc/IRCWindow";
import ChannelList from "../apps/mirc/ChannelList";
import MessagePanel from "../apps/mirc/MessagePanel";
import SwapComponent from "../apps/SwapComponent";
import SendFundsComponent from "../apps/SendFundsComponent";
import SecTools from "../apps/sectools/SecTools";
import Split from "../apps/sectools/Split";
import Unsplit from "../apps/sectools/Unsplit";



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
			initialPosition: { x: 1, y: 1, width: 250, height: 250, smHeight: 250},	
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
			menuLabel: 'New Desk...'
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
					initialPosition: { x: 'auto', y: 0, width: 375, height: 650, smHeight: 350},
				},
				{
					progID: 2,
					title: "Open with...",
					icon: "💰",
					progName: "winbit32.exe", // Added name for "Paintbrush"
					openLevel: -1,
					addProgramData: ["phrase"]
				}
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
					initialPosition: { x: 'auto', y: 0, width: 375, height: 650, smHeight: 350},
				},
				{
					progID: 2,
					title: "Send",
					icon: "✉️",
					progName: "send.exe", // Added name for "Paintbrush"
					component: SendFundsComponent,
					initialPosition: { x: 1, y: 1, width: 425, height: 550, smHeight: 350},
				},
				{
					progID: 3,
					title: "mayaIRC",
					icon: "📡",
					progName: "mirc.exe", // Added name for "Paintbrush"
					component: IRCWindow,
					initialPosition: { x: 1, y: 1, width: 425, height: 485 },
					programs: [
						{
							progID: 0,
							title: "Channel List",
							//unicode icon:
							icon: "📃",
							component: ChannelList,
							progName: "clist.exe", // Added name for "Channel List
							defaultOpen: true,
							maximized: true,
							params: { _onOpenWindow: "!!handleOpenWindow" },
						},
						{
							progID: 1,
							title: "Message Panel",
							icon: "💬",
							progName: "msgpanel.exe", // Added name for "Message Panel"
							component: MessagePanel,
							maximized: true,
							defaultOpen: false,
						},
					],
				},
			],
		},
	];

};