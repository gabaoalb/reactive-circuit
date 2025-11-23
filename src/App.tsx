import Canvas from "./components/canvas/Canvas";
import Header from "./components/header/Header";
import Wrapper from "./components/wrapper/Wrapper";
import RootProvider from "./context/RootProvider";

function App() {
	return (
		<RootProvider>
			<Header />
			<Wrapper>
				<Canvas />
			</Wrapper>
		</RootProvider>
	);
}

export default App;
