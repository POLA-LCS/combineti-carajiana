import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    Modal,
    Dimensions,
    Platform // Necesario para asegurar la experiencia de diseño
} from 'react-native';
// Uso de SafeAreaContext según lo solicitado
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
// Usamos AsyncStorage para la persistencia
import AsyncStorage from '@react-native-async-storage/async-storage';
// Componentes de iconos apropiados para React Native
import {
    Menu, X, ChevronLeft, Clock,
    Trophy, TrendingUp, Shield, Zap, AlertTriangle,
    Save, History, Info, HelpCircle, FileText, Lock, Trash2
} from 'lucide-react-native';

// --- MOCK DATA ---
const MOCK_MATCHES = [
    {
        id: '1',
        league: 'Champions League',
        home: 'Real Madrid',
        away: 'Man. City',
        time: '21:00',
        stadium: 'Santiago Bernabéu',
        date: 'Hoy',
        color: 'from-purple-900 to-blue-900'
    },
    {
        id: '2',
        league: 'Premier League',
        home: 'Arsenal',
        away: 'Liverpool',
        time: '18:30',
        stadium: 'Emirates Stadium',
        date: 'Hoy',
        color: 'from-red-900 to-red-700'
    },
    {
        id: '3',
        league: 'La Liga',
        home: 'Barcelona',
        away: 'Atlético',
        time: '20:00',
        stadium: 'Camp Nou',
        date: 'Hoy',
        color: 'from-blue-900 to-red-900'
    },
    {
        id: '4',
        league: 'Serie A',
        home: 'Inter',
        away: 'Juventus',
        time: '20:45',
        stadium: 'San Siro',
        date: 'Hoy',
        color: 'from-blue-800 to-black'
    }
];

// Algoritmo simulado de IA para generar apuestas
const generateAIPredictions = (match) => {
    return [
        {
            level: 'Conservadora', icon: Shield, textColor: 'text-green-400', iconColor: '#4ade80', borderColor: 'border-green-500/30', description: 'Alta probabilidad, ideal para asegurar.',
            bets: ['Más de 1.5 Goles en total', `Gana o Empata ${match.home}`, 'Más de 3.5 tarjetas totales'], multiplier: 1.85, confidence: '89%'
        },
        {
            level: 'Equilibrada', icon: Zap, textColor: 'text-blue-400', iconColor: '#60a5fa', borderColor: 'border-blue-500/30', description: 'Balance entre riesgo y beneficio.',
            bets: ['Ambos equipos marcan: SÍ', `${match.home} marca en el 2do tiempo`, 'Más de 8.5 córners'], multiplier: 3.40, confidence: '65%'
        },
        {
            level: 'Arriesgada (High Risk)', icon: AlertTriangle, textColor: 'text-orange-400', iconColor: '#fb923c', borderColor: 'border-orange-500/30', description: 'Combinada compleja con alto retorno.',
            bets: [`Gana ${match.away} y más de 2.5 goles`, 'Expulsión (Tarjeta Roja): SÍ'], multiplier: 12.50, confidence: '22%'
        }
    ];
};

// --- COMPONENTS ---

const Button = ({ children, onPress, variant = 'primary', style }) => {
    const baseStyle = "px-4 py-3 rounded-xl flex-row items-center justify-center gap-2 transition-all active:opacity-75";
    // Estilos para mantener la estética oscura/azul
    let variantStyle = variant === 'outline' ? "border border-slate-600 bg-transparent" : "bg-blue-600 shadow-lg shadow-blue-900/50";
    let textStyle = variant === 'outline' ? "text-slate-300 font-semibold" : "text-white font-semibold";

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={tw`${baseStyle} ${variantStyle} ${style}`}>
            {typeof children === 'string' ? <Text style={tw`${textStyle}`}>{children}</Text> : children}
        </TouchableOpacity>
    );
};

const MatchCard = ({ match, onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={tw`bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-4 relative overflow-hidden shadow-lg`}>
        {/* Fondo decorativo con gradiente para mantener la estética */}
        <View style={tw`absolute inset-0 bg-gradient-to-r ${match.color} opacity-10`} />

        <View style={tw`relative z-10`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
                <View style={tw`flex-row items-center gap-1`}><Trophy size={14} color="#94a3b8" /><Text style={tw`text-xs font-medium text-slate-400 uppercase`}>{match.league}</Text></View>
                <View style={tw`flex-row items-center gap-1`}><Clock size={14} color="#60a5fa" /><Text style={tw`text-xs font-medium text-blue-400`}>{match.time}</Text></View>
            </View>
            <View style={tw`flex-row justify-between items-center`}>
                <View style={tw`w-1/3 items-center`}><View style={tw`w-12 h-12 bg-slate-700 rounded-full mb-2 items-center justify-center`}><Text style={tw`font-bold text-lg text-white`}>{match.home.substring(0, 1)}</Text></View><Text style={tw`font-bold text-slate-100`} numberOfLines={1}>{match.home}</Text></View>
                <View style={tw`w-1/3 items-center`}><Text style={tw`text-2xl font-bold text-slate-500`}>VS</Text></View>
                <View style={tw`w-1/3 items-center`}><View style={tw`w-12 h-12 bg-slate-700 rounded-full mb-2 items-center justify-center`}><Text style={tw`font-bold text-lg text-white`}>{match.away.substring(0, 1)}</Text></View><Text style={tw`font-bold text-slate-100`} numberOfLines={1}>{match.away}</Text></View>
            </View>
        </View>
    </TouchableOpacity>
);

const PredictionCard = ({ prediction, onSave }) => (
    <View style={tw`bg-slate-800/80 border ${prediction.borderColor} rounded-2xl p-5 mb-6 shadow-lg`}>
        <View style={tw`flex-row justify-between items-start mb-3`}>
            <View style={tw`flex-row items-center gap-2`}>
                <prediction.icon color={prediction.iconColor} size={20} />
                <Text style={tw`font-bold text-lg ${prediction.textColor}`}>{prediction.level}</Text>
            </View>
            <View style={tw`bg-slate-900/80 px-2 py-1 rounded`}><Text style={tw`text-xs text-slate-400 font-mono`}>Confianza: {prediction.confidence}</Text></View>
        </View>
        <Text style={tw`text-sm text-slate-400 mb-4`}>{prediction.description}</Text>
        <View style={tw`space-y-2 mb-4`}>
            {prediction.bets.map((bet, idx) => (
                <View key={idx} style={tw`flex-row items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-slate-700/30`}>
                    <View style={tw`w-1.5 h-1.5 rounded-full bg-blue-500`} />
                    <Text style={tw`text-sm text-slate-200 flex-1`}>{bet}</Text>
                </View>
            ))}
        </View>
        <View style={tw`flex-row items-center justify-between mt-4 pt-4 border-t border-slate-700/50`}>
            <View><Text style={tw`text-xs text-slate-400 uppercase`}>Multiplicador</Text><Text style={tw`text-2xl font-bold text-white`}>x{prediction.multiplier.toFixed(2)}</Text></View>
            <Button onPress={onSave} style={tw`py-2 px-6`}><View style={tw`flex-row gap-2`}><Save size={16} color="white" /><Text style={tw`text-white font-semibold text-sm`}>Guardar</Text></View></Button>
        </View>
    </View>
);

const Sidebar = ({ isOpen, close, navigate }) => {
    if (!isOpen) return null;
    const { width } = Dimensions.get('window');
    const drawerWidth = Math.min(300, width * 0.75);

    const menuItems = [
        { label: 'Historial', icon: History, id: 'history' },
        { label: 'Contacto', icon: Info, id: 'contact' },
        { label: 'FAQ', icon: HelpCircle, id: 'faq' },
        { label: 'Términos de Uso', icon: FileText, id: 'terms' },
        { label: 'Política de Privacidad', icon: Lock, id: 'privacy' },
    ];

    return (
        <Modal animationType="fade" transparent={true} visible={isOpen} onRequestClose={close}>
            <View style={tw`flex-1 bg-black/80 flex-row`}>
                {/* Área de fondo transparente para cerrar (izquierda) */}
                <TouchableOpacity style={tw`flex-1`} onPress={close} activeOpacity={1} />

                {/* Contenedor del menú (alineado a la derecha, envuelto en SafeAreaView) */}
                {/* Uso de SafeAreaView aquí: */}
                <SafeAreaView style={[{ width: drawerWidth }, tw`bg-slate-900 h-full border-l border-slate-800 shadow-2xl shadow-black`]} edges={['top', 'bottom', 'right']}>

                    <View style={tw`p-6 border-b border-slate-800 flex-row justify-between items-center bg-blue-900/20`}>
                        <Text style={tw`text-xl font-bold text-white italic tracking-tighter`}>Combineti <Text style={tw`text-sm font-normal text-slate-400`}>Carajiana</Text></Text>
                        <TouchableOpacity onPress={close}><X size={24} color="#94a3b8" /></TouchableOpacity>
                    </View>

                    <ScrollView style={tw`p-4`}>
                        {menuItems.map((item) => (
                            <TouchableOpacity key={item.id} onPress={() => { navigate(item.id); close(); }} style={tw`flex-row items-center gap-4 p-4 rounded-xl mb-2 active:bg-slate-800`}>
                                <item.icon size={20} color="#cbd5e1" /><Text style={tw`font-medium text-slate-300`}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={tw`p-6 items-center border-t border-slate-800`}>
                        <Text style={tw`text-xs text-slate-600`}>v1.0.0 Alpha</Text>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

// Componente Wrapper para simular el ancho máximo y centrado en web/desktop
const ContentWrapper = ({ children }) => (
    <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-20`}>
        <View style={tw`w-full max-w-6xl self-center px-4 md:px-8 pt-4`}>
            {children}
        </View>
    </ScrollView>
);

// --- SCREENS ---

const HomeScreen = ({ matches, onSelectMatch }) => (
    <ContentWrapper>
        <View style={tw`mb-6 mt-4`}>
            <Text style={tw`text-3xl font-bold text-white mb-1`}>Combinadas de Hoy</Text>
            <Text style={tw`text-slate-400 text-sm`}>Nuestra IA ha detectado {matches.length} oportunidades clave. ¡Elige con inteligencia!</Text>
        </View>

        {/* Grid de Partidos (simulado con flexWrap para RN) */}
        <View style={tw`flex-row flex-wrap justify-center sm:justify-start -m-2`}>
            {matches.map(match => (
                // En pantallas grandes, ocupa 1/2 o 1/3 del ancho
                <View key={match.id} style={tw`w-full sm:w-1/2 lg:w-1/3 p-2`}>
                    <MatchCard match={match} onPress={() => onSelectMatch(match)} />
                </View>
            ))}
        </View>
    </ContentWrapper>
);

const MatchDetailScreen = ({ match, onBack, onSaveBet }) => {
    const predictions = generateAIPredictions(match);
    return (
        <ContentWrapper>
            <TouchableOpacity onPress={onBack} style={tw`flex-row items-center mb-6 p-2 -ml-2`}><ChevronLeft size={20} color="#94a3b8" /><Text style={tw`text-slate-400 ml-1`}>Volver a Partidos</Text></TouchableOpacity>

            <View style={tw`bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 items-center border border-slate-700 shadow-xl mb-10 relative overflow-hidden`}>
                <View style={tw`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${match.color}`} />
                <Text style={tw`text-sm uppercase tracking-widest text-slate-400 mb-4`}>{match.league}</Text>
                <View style={tw`flex-row justify-between items-center w-full px-2`}>
                    <Text style={tw`text-white font-bold text-3xl flex-1 text-center`} numberOfLines={1}>{match.home}</Text>
                    <Text style={tw`text-3xl font-black text-blue-500 mx-4`}>VS</Text>
                    <Text style={tw`text-white font-bold text-3xl flex-1 text-center`} numberOfLines={1}>{match.away}</Text>
                </View>
                <View style={tw`mt-4 text-xs text-slate-500 bg-slate-950/30 px-3 py-1 rounded-full`}>
                    <Text style={tw`text-slate-500 text-xs`}>{match.stadium} • {match.time}</Text>
                </View>
            </View>

            <View style={tw`flex-row items-center gap-2 mb-6`}><TrendingUp color="#3b82f6" size={20} /><Text style={tw`text-lg font-bold text-white`}>Nuestra Predicción Carajiana</Text></View>
            {predictions.map((pred, idx) => (
                <PredictionCard
                    key={idx}
                    prediction={pred}
                    onSave={() => Alert.alert('Confirmación', `¿Deseas guardar la combinada ${pred.level}?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Guardar', onPress: () => onSaveBet({ id: Date.now() + idx, match, ...pred, date: new Date().toLocaleDateString('es-ES') }) }
                    ])}
                />
            ))}
        </ContentWrapper>
    );
};

const HistoryScreen = ({ history, onClear, onDelete }) => (
    <ContentWrapper>
        <View style={tw`flex-row justify-between items-center mb-6 mt-4`}>
            <Text style={tw`text-2xl font-bold text-white`}>Mi Historial de Combinadas</Text>
            {history.length > 0 &&
                <TouchableOpacity onPress={() => Alert.alert('Confirmación', '¿Seguro que quieres borrar TODO el historial?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Borrar Todo', style: 'destructive', onPress: onClear }
                ])}>
                    <Text style={tw`text-xs text-red-400 active:text-red-300`}>Borrar todo</Text>
                </TouchableOpacity>
            }
        </View>

        {history.length === 0 ? (
            <View style={tw`items-center py-20 opacity-50`}><History size={48} color="#475569" style={tw`mb-4`} /><Text style={tw`text-slate-400`}>Aún no has guardado ninguna combinada.</Text></View>
        ) : (
            <View style={tw`space-y-4`}>
                {history.map((item) => (
                    <View key={item.id} style={tw`bg-slate-800 border border-slate-700 p-4 rounded-xl relative shadow-md`}>
                        {/* Botón de Borrado Individual */}
                        <TouchableOpacity
                            onPress={() => Alert.alert('Confirmación', '¿Eliminar esta combinada?', [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) }
                            ])}
                            style={tw`absolute top-3 right-3 p-2`}
                        >
                            <Trash2 size={18} color="#f87171" />
                        </TouchableOpacity>

                        <Text style={tw`text-xs text-slate-500 mb-2`}>{item.date}</Text>
                        <Text style={tw`font-bold text-white text-base mb-1`}>{item.match.home} vs {item.match.away}</Text>

                        <Text style={tw`text-xs px-2 py-0.5 rounded ${item.textColor.replace('text-', 'bg-').replace('400', '900/50')} ${item.textColor} mb-3 inline-block font-mono`}>
                            {item.level}
                        </Text>

                        {item.bets.map((bet, bIdx) => (
                            <View key={bIdx} style={tw`flex-row items-center gap-2 mb-1`}>
                                <View style={tw`w-1 h-1 rounded-full bg-blue-500`} />
                                <Text style={tw`text-xs text-slate-300`}>{bet}</Text>
                            </View>
                        ))}

                        <Text style={tw`font-bold text-blue-400 text-right text-lg mt-3`}>x{item.multiplier.toFixed(2)}</Text>
                    </View>
                ))}
            </View>
        )}
    </ContentWrapper>
);

const InfoScreen = ({ title, content }) => (
    <ContentWrapper>
        <Text style={tw`text-3xl font-bold text-white mb-6 mt-4`}>{title}</Text>
        <View style={tw`bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-inner`}>
            {/* Usar "\n" para saltos de línea en Text */}
            <Text style={tw`text-slate-300 text-sm leading-relaxed`}>{content}</Text>
        </View>
    </ContentWrapper>
);

// --- MAIN APP LOGIC ---

function MainApp() {
    const [screen, setScreen] = useState('home');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const load = async () => {
            const saved = await AsyncStorage.getItem('combineti_history');
            if (saved) setHistory(JSON.parse(saved));
        };
        load();
    }, []);

    const saveHistory = async (newHistory) => {
        setHistory(newHistory);
        await AsyncStorage.setItem('combineti_history', JSON.stringify(newHistory));
    };

    const saveBet = (bet) => {
        const newHistory = [bet, ...history];
        saveHistory(newHistory);
        Alert.alert('¡Éxito!', 'Combinada guardada con éxito.');
    };

    const clearHistory = () => {
        saveHistory([]);
    };

    const deleteBet = (idToDelete) => {
        const newHistory = history.filter(item => item.id !== idToDelete);
        saveHistory(newHistory);
    };

    const navigate = (screenName) => {
        setScreen(screenName);
    };

    const handleMatchSelect = (match) => {
        setSelectedMatch(match);
        navigate('match-detail');
    };

    const renderScreen = () => {
        const contactContent = `Combineti Carajiana - Soporte Premium\n\n¿Necesitas ayuda o tienes alguna sugerencia compleja? Estamos aquí para ti.\n\n- Correo Electrónico: combineticarajiana@support.app\n- Horario de Atención: Lunes a Sábado, 8:00 - 23:00 (GMT-3)`;

        const faqContent = `## ¿Qué hace la IA de Combineti?\nNuestra Inteligencia Artificial analiza millones de datos históricos, variables de juego recientes, y patrones ocultos para calcular la probabilidad más alta de resultados complejos, ofreciéndote combinadas optimizadas.\n\n## ¿Puedo confiar ciegamente en las predicciones?\nNo. La IA es una herramienta estadística avanzada. Las apuestas deportivas son intrínsecamente riesgosas y están sujetas a eventos inesperados. Usa Combineti como una guía informada, nunca como una garantía de ganancias.\n\n## ¿Cómo funciona el historial?\nTu historial se guarda localmente en tu dispositivo usando AsyncStorage. Esto asegura tu privacidad, ya que no recopilamos tus datos personales ni tus apuestas. Si desinstalas la app, el historial se perderá.`;

        switch (screen) {
            case 'home':
                return <HomeScreen matches={MOCK_MATCHES} onSelectMatch={handleMatchSelect} />;
            case 'match-detail':
                return selectedMatch ? (
                    <MatchDetailScreen
                        match={selectedMatch}
                        onBack={() => navigate('home')}
                        onSaveBet={saveBet}
                    />
                ) : navigate('home');
            case 'history':
                return <HistoryScreen history={history} onClear={clearHistory} onDelete={deleteBet} />;
            case 'contact':
                return <InfoScreen title="Contacto Carajiano" content={contactContent} />;
            case 'faq':
                return <InfoScreen title="Preguntas Frecuentes (FAQ)" content={faqContent} />;
            case 'terms':
                return <InfoScreen title="Términos de Uso" content={`Esta aplicación es solo para fines informativos y de entretenimiento, destinada a usuarios mayores de 18 años.\n\nCombineti no es un servicio de apuestas. El usuario es el único responsable de cualquier acción o apuesta realizada en plataformas de terceros. El uso de esta IA no garantiza ganancias.\n\nAl usar esta aplicación, usted acepta estos términos.`} />;
            case 'privacy':
                return <InfoScreen title="Política de Privacidad" content={`Tu privacidad es fundamental. No recopilamos datos personales, registros de usuarios, ni información de pago.\n\nEl "Historial de Combinadas" se almacena exclusivamente en tu dispositivo (localmente).`} />;
            default:
                return <HomeScreen matches={MOCK_MATCHES} onSelectMatch={handleMatchSelect} />;
        }
    };

    return (
        // Contenedor principal de React Native
        // Mantenemos el estilo oscuro consistente en toda la aplicación
        // Uso de SafeAreaView aquí:
        <SafeAreaView style={tw`flex-1 bg-slate-900`} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {/* Header Flotante */}
            <View style={tw`bg-slate-900 border-b border-slate-800 px-4 h-16 flex-row items-center justify-between z-30`}>
                <TouchableOpacity onPress={() => navigate('home')}>
                    {/* Nombre actualizado a Combineti */}
                    <Text style={tw`font-black text-xl italic tracking-tighter text-white`}>COMBINETI</Text>
                </TouchableOpacity>
                {/* Botón de Menú para abrir el Sidebar (a la derecha) */}
                <TouchableOpacity onPress={() => setSidebarOpen(true)} style={tw`p-2 -mr-2`}>
                    <Menu color="white" size={24} />
                </TouchableOpacity>
            </View>

            {/* Contenido de la Pantalla */}
            <View style={tw`flex-1 bg-slate-900`}>
                {renderScreen()}
            </View>

            {/* Sidebar Overlay (Apertura desde la derecha) */}
            <Sidebar
                isOpen={isSidebarOpen}
                close={() => setSidebarOpen(false)}
                navigate={navigate}
            />
        </SafeAreaView>
    );
}

// --- ROOT EXPORT ---

export default function App() {
    return (
        // Provider necesario para el SafeAreaContext
        // Uso de SafeAreaProvider aquí:
        <SafeAreaProvider>
            <MainApp />
        </SafeAreaProvider>
    );
}