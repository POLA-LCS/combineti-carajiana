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
    ActivityIndicator,
    Platform // Importamos Platform para posibles ajustes específicos
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Menu, X, ChevronLeft, Clock,
    Trophy, TrendingUp, Shield, Zap, AlertTriangle,
    Save, History, Info, HelpCircle, FileText, Lock, Trash2, Loader
} from 'lucide-react-native';

// --- CONSTANTES Y CONFIGURACIÓN DE CACHE ---
const MATCHES_CACHE_KEY = 'combineti_matches_cache';
const CACHE_TTL_MINUTES = 5; // Tiempo de vida de la caché: 5 minutos
const CACHE_TTL_MS = CACHE_TTL_MINUTES * 60 * 1000;

// --- MOCK DATA (Para simular la respuesta de la API) ---
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

// --- HELPER FUNCTIONS DE CACHE ---

const loadCache = async () => {
    try {
        const cachedData = await AsyncStorage.getItem(MATCHES_CACHE_KEY);
        if (cachedData) {
            const { timestamp, matches } = JSON.parse(cachedData);
            const now = Date.now();
            const isFresh = (now - timestamp) < CACHE_TTL_MS;
            return { matches, isFresh, timestamp };
        }
        return { matches: [], isFresh: false, timestamp: 0 };
    } catch (e) {
        console.error("Error loading cache:", e);
        return { matches: [], isFresh: false, timestamp: 0 };
    }
};

const saveCache = async (matches) => {
    try {
        const data = JSON.stringify({
            timestamp: Date.now(),
            matches: matches,
        });
        await AsyncStorage.setItem(MATCHES_CACHE_KEY, data);
    } catch (e) {
        console.error("Error saving cache:", e);
    }
};


// --- COMPONENTS (Sin cambios mayores, solo se mantienen los estilos) ---

const Button = ({ children, onPress, variant = 'primary', style }) => {
    const baseStyle = "px-6 py-3.5 rounded-xl flex-row items-center justify-center gap-2 transition-all active:opacity-75";
    let variantStyle = variant === 'outline' ? "border border-slate-600 bg-transparent" : "bg-blue-600 shadow-xl shadow-blue-900/60";
    let textStyle = variant === 'outline' ? "text-slate-300 font-bold" : "text-white font-bold";

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={tw`${baseStyle} ${variantStyle} ${style}`}>
            {typeof children === 'string' ? <Text style={tw`${textStyle}`}>{children}</Text> : children}
        </TouchableOpacity>
    );
};

const MatchCard = ({ match, onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={tw`bg-slate-800/60 border border-slate-600/50 rounded-2xl p-5 mb-4 relative overflow-hidden shadow-2xl shadow-slate-900`}>
        {/* Fondo decorativo con gradiente para mantener la estética */}
        <View style={tw`absolute inset-0 bg-gradient-to-r ${match.color} opacity-15`} />

        <View style={tw`relative z-10`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
                <View style={tw`flex-row items-center gap-1`}><Trophy size={14} color="#94a3b8" /><Text style={tw`text-xs font-semibold text-slate-300 uppercase`}>{match.league}</Text></View>
                <View style={tw`flex-row items-center gap-1`}><Clock size={14} color="#60a5fa" /><Text style={tw`text-sm font-bold text-blue-400`}>{match.time}</Text></View>
            </View>
            <View style={tw`flex-row justify-between items-center`}>
                <View style={tw`w-1/3 items-center`}><View style={tw`w-14 h-14 bg-slate-700/80 rounded-full mb-2 items-center justify-center border-2 border-blue-500/20`}><Text style={tw`font-extrabold text-xl text-white`}>{match.home.substring(0, 1)}</Text></View><Text style={tw`font-extrabold text-slate-100 text-base`} numberOfLines={1}>{match.home}</Text></View>
                <View style={tw`w-1/3 items-center`}><Text style={tw`text-3xl font-extrabold text-slate-500`}>VS</Text></View>
                <View style={tw`w-1/3 items-center`}><View style={tw`w-14 h-14 bg-slate-700/80 rounded-full mb-2 items-center justify-center border-2 border-red-500/20`}><Text style={tw`font-extrabold text-xl text-white`}>{match.away.substring(0, 1)}</Text></View><Text style={tw`font-extrabold text-slate-100 text-base`} numberOfLines={1}>{match.away}</Text></View>
            </View>
        </View>
    </TouchableOpacity>
);

const PredictionCard = ({ prediction, onSave }) => (
    <View style={tw`bg-slate-800/90 border-t-2 ${prediction.borderColor} rounded-2xl p-6 mb-6 shadow-xl shadow-slate-900/80`}>
        <View style={tw`flex-row justify-between items-start mb-3`}>
            <View style={tw`flex-row items-center gap-2`}>
                <prediction.icon color={prediction.iconColor} size={24} />
                <Text style={tw`font-extrabold text-xl ${prediction.textColor}`}>{prediction.level}</Text>
            </View>
            <View style={tw`bg-blue-900/30 border border-blue-700/50 px-3 py-1 rounded-full`}><Text style={tw`text-xs text-blue-300 font-mono font-semibold`}>Confianza: {prediction.confidence}</Text></View>
        </View>
        <Text style={tw`text-sm text-slate-400 mb-4`}>{prediction.description}</Text>
        <View style={tw`space-y-3 mb-4`}>
            {prediction.bets.map((bet, idx) => (
                <View key={idx} style={tw`flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50`}>
                    <View style={tw`w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50`} />
                    <Text style={tw`text-sm text-slate-200 font-medium flex-1`}>{bet}</Text>
                </View>
            ))}
        </View>
        <View style={tw`flex-row items-center justify-between mt-4 pt-4 border-t border-slate-700/50`}>
            <View><Text style={tw`text-xs text-slate-500 uppercase`}>Multiplicador IA</Text><Text style={tw`text-3xl font-extrabold text-blue-400`}>x{prediction.multiplier.toFixed(2)}</Text></View>
            <Button onPress={onSave} style={tw`py-3 px-8`}><View style={tw`flex-row gap-2`}><Save size={18} color="white" /><Text style={tw`text-white font-bold text-base`}>GUARDAR</Text></View></Button>
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
                <SafeAreaView style={[{ width: drawerWidth }, tw`bg-slate-950 h-full border-l border-slate-800 shadow-2xl shadow-black`]} edges={['top', 'bottom', 'right']}>

                    {/* Header del Sidebar con estilo más definido */}
                    <View style={tw`p-6 border-b border-slate-800 flex-row justify-between items-center bg-blue-900/30`}>
                        <Text style={tw`text-2xl font-black text-white italic tracking-widest`}>COMBINETI</Text>
                        <TouchableOpacity onPress={close}><X size={26} color="#ffffff" /></TouchableOpacity>
                    </View>

                    <ScrollView style={tw`p-2 mt-2`}>
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => { navigate(item.id); close(); }}
                                style={tw`flex-row items-center gap-4 p-4 rounded-xl mb-1 active:bg-slate-800/70 border border-transparent hover:border-blue-700/50`}
                            >
                                <item.icon size={22} color="#60a5fa" /><Text style={tw`font-semibold text-slate-200 text-base`}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={tw`p-6 items-center border-t border-slate-800 bg-slate-900`}>
                        <Text style={tw`text-xs text-slate-600`}>v1.0.1 (Cached) | Motor IA Carajiana</Text>
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

const HomeScreen = ({ matches, onSelectMatch, isLoading, error, lastFetch }) => {

    // Estado de carga
    if (isLoading) {
        return (
            <View style={tw`flex-1 items-center justify-center p-8`}>
                <ActivityIndicator size="large" color="#3b82f6" style={tw`mb-4`} />
                <Text style={tw`text-xl font-extrabold text-blue-400 mb-2`}>Conectando con el Motor IA...</Text>
                <Text style={tw`text-sm text-slate-400 text-center`}>Estamos cargando las oportunidades clave de hoy desde la red de datos carajiana.</Text>
            </View>
        );
    }

    // Estado de error
    if (error && matches.length === 0) {
        return (
            <View style={tw`flex-1 items-center justify-center p-8`}>
                <AlertTriangle size={56} color="#f87171" style={tw`mb-4`} />
                <Text style={tw`text-xl font-extrabold text-red-400 mb-2`}>Error de Conexión</Text>
                <Text style={tw`text-sm text-slate-400 text-center`}>{error}</Text>
            </View>
        );
    }

    // Sin partidos disponibles
    if (matches.length === 0) {
        return (
            <View style={tw`flex-1 items-center justify-center p-8`}>
                <Trophy size={56} color="#475569" style={tw`mb-4 opacity-50`} />
                <Text style={tw`text-xl font-extrabold text-slate-300 mb-2`}>No hay Partidos Principales Hoy</Text>
                <Text style={tw`text-sm text-slate-400 text-center`}>Vuelve mañana para ver las nuevas combinadas de la IA.</Text>
            </View>
        );
    }

    const lastFetchDate = lastFetch ? new Date(lastFetch).toLocaleTimeString('es-ES') : 'N/A';

    // Partidos cargados correctamente
    return (
        <ContentWrapper>
            <View style={tw`mb-8 mt-6`}>
                <Text style={tw`text-4xl font-extrabold text-white mb-1 tracking-tight`}>Combinadas de Hoy</Text>
                <Text style={tw`text-blue-400 text-base font-medium`}>Nuestra IA ha detectado {matches.length} oportunidades clave. ¡Elige con inteligencia!</Text>
                <Text style={tw`text-xs text-slate-500 mt-1`}>Datos actualizados: {lastFetchDate} (Cache {CACHE_TTL_MINUTES}m TTL)</Text>
                {error && <View style={tw`mt-3 bg-red-900/30 border border-red-700/50 p-3 rounded-xl flex-row items-center gap-2`}><AlertTriangle size={16} color="#f87171" /><Text style={tw`text-red-400 text-xs`}>Alerta: Error al actualizar. Mostrando datos en caché.</Text></View>}
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
};

const MatchDetailScreen = ({ match, onBack, onSaveBet }) => {
    const predictions = generateAIPredictions(match);
    return (
        <ContentWrapper>
            <TouchableOpacity onPress={onBack} style={tw`flex-row items-center mb-6 p-2 -ml-2 active:opacity-70`}><ChevronLeft size={22} color="#60a5fa" /><Text style={tw`text-blue-400 ml-1 font-semibold`}>Volver a Partidos</Text></TouchableOpacity>

            {/* Cabecera del partido con estilo más elegante */}
            <View style={tw`bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 items-center border border-blue-700/50 shadow-2xl shadow-blue-900/50 mb-10 relative overflow-hidden`}>
                <View style={tw`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${match.color}`} />
                <Text style={tw`text-base uppercase tracking-widest font-semibold text-slate-400 mb-4`}>{match.league}</Text>
                <View style={tw`flex-row justify-between items-center w-full px-2`}>
                    <Text style={tw`text-white font-extrabold text-4xl flex-1 text-center`} numberOfLines={1}>{match.home}</Text>
                    <Text style={tw`text-4xl font-black text-blue-500 mx-6`}>VS</Text>
                    <Text style={tw`text-white font-extrabold text-4xl flex-1 text-center`} numberOfLines={1}>{match.away}</Text>
                </View>
                <View style={tw`mt-6 text-sm text-slate-400 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-700`}>
                    <Text style={tw`text-slate-400 text-sm font-medium`}>{match.stadium} | {match.time}</Text>
                </View>
            </View>

            <View style={tw`flex-row items-center gap-3 mb-6`}><TrendingUp color="#3b82f6" size={24} /><Text style={tw`text-2xl font-extrabold text-white`}>Nuestra Predicción Carajiana</Text></View>
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
            <Text style={tw`text-3xl font-extrabold text-white`}>Mi Historial de Combinadas</Text>
            {history.length > 0 &&
                <TouchableOpacity onPress={() => Alert.alert('Confirmación', '¿Seguro que quieres borrar TODO el historial?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Borrar Todo', style: 'destructive', onPress: onClear }
                ])}>
                    <Text style={tw`text-sm text-red-400 font-semibold active:text-red-300`}>Borrar todo</Text>
                </TouchableOpacity>
            }
        </View>

        {history.length === 0 ? (
            <View style={tw`items-center py-20 opacity-50`}><History size={56} color="#475569" style={tw`mb-4`} /><Text style={tw`text-slate-400 text-base`}>Aún no has guardado ninguna combinada.</Text></View>
        ) : (
            <View style={tw`space-y-4`}>
                {history.map((item) => (
                    <View key={item.id} style={tw`bg-slate-800 border border-slate-700 p-4 rounded-xl relative shadow-md shadow-slate-900`}>
                        {/* Botón de Borrado Individual */}
                        <TouchableOpacity
                            onPress={() => Alert.alert('Confirmación', '¿Eliminar esta combinada?', [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) }
                            ])}
                            style={tw`absolute top-3 right-3 p-2 bg-slate-700/50 rounded-full`}
                        >
                            <Trash2 size={18} color="#f87171" />
                        </TouchableOpacity>

                        <Text style={tw`text-xs text-slate-500 mb-2`}>{item.date}</Text>
                        <Text style={tw`font-extrabold text-white text-lg mb-1`}>{item.match.home} vs {item.match.away}</Text>

                        <Text style={tw`text-sm px-3 py-1 rounded-full ${item.textColor.replace('text-', 'bg-').replace('400', '900/50')} ${item.textColor} mb-3 inline-block font-mono font-bold`}>
                            {item.level}
                        </Text>

                        {item.bets.map((bet, bIdx) => (
                            <View key={bIdx} style={tw`flex-row items-center gap-2 mb-1`}>
                                <View style={tw`w-1 h-1 rounded-full bg-blue-500`} />
                                <Text style={tw`text-sm text-slate-300`}>{bet}</Text>
                            </View>
                        ))}

                        <Text style={tw`font-extrabold text-blue-400 text-right text-xl mt-3`}>x{item.multiplier.toFixed(2)}</Text>
                    </View>
                ))}
            </View>
        )}
    </ContentWrapper>
);

const InfoScreen = ({ title, content }) => (
    <ContentWrapper>
        <Text style={tw`text-3xl font-extrabold text-white mb-8 mt-6`}>{title}</Text>
        <View style={tw`bg-slate-800/80 p-6 rounded-2xl border border-blue-700/50 shadow-inner shadow-black/50`}>
            {/* Usar "\n" para saltos de línea en Text */}
            <Text style={tw`text-slate-300 text-base leading-relaxed`}>{content}</Text>
        </View>
    </ContentWrapper>
);

// --- MAIN APP LOGIC ---

function MainApp() {
    const [matches, setMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null); // Nuevo estado para la hora de la última carga

    const [screen, setScreen] = useState('home');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [history, setHistory] = useState([]);

    // Función principal para la carga de partidos con lógica de cacheo
    const fetchImportantMatches = async () => {
        setIsLoading(true);
        setError(null);

        // 1. INTENTAR CARGAR DESDE CACHÉ
        const { matches: cachedMatches, isFresh, timestamp } = await loadCache();

        if (cachedMatches.length > 0 && isFresh) {
            console.log('Cache Hit: Datos frescos encontrados. Evitando llamada a API.');
            setMatches(cachedMatches);
            setLastFetch(timestamp);
            setIsLoading(false);
            return; // Detiene la ejecución aquí si el caché es fresco
        }

        // 2. Si el caché está expirado o vacío, proceder a la llamada a la API
        console.log('Cache Miss/Stale: Intentando obtener datos de la API.');

        // *************** INICIO DE SIMULACIÓN DE LLAMADA A API ***************
        // En un entorno real, reemplazarías este bloque por tu lógica de fetch real
        // con manejo de API Key y try/catch. Usamos MOCK_MATCHES + setTimeout para simular latencia

        const API_URL = 'https://api.football-data.org/v4/matches?status=SCHEDULED&dateFrom=...';
        // Simulación:
        try {
            // Simular la latencia de red (2 segundos)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Simulación: Simular fallo el 10% de las veces para probar el fallback
            // if (Math.random() < 0.1) throw new Error("API Rate Limit Exceeded (Simulated)");

            const newMatches = MOCK_MATCHES;

            // 3. Éxito: Guardar en caché y actualizar estado
            await saveCache(newMatches);
            setMatches(newMatches);
            setLastFetch(Date.now());
            setError(null);

        } catch (e) {
            console.error("Error fetching data:", e);

            // 4. Fallo: Intentar usar datos de caché viejos si existen
            if (cachedMatches.length > 0) {
                console.log('API Fallo: Usando datos de caché viejos como fallback.');
                setMatches(cachedMatches);
                setLastFetch(timestamp);
                setError("La API no respondió. Mostrando datos no actualizados.");
            } else {
                // No hay datos, ni nuevos ni viejos
                setError("No pudimos cargar los partidos importantes. Revisa tu conexión a internet.");
                setMatches([]);
            }
        } finally {
            setIsLoading(false);
        }

        // *************** FIN DE SIMULACIÓN DE LLAMADA A API ***************
    };

    // useEffect para cargar el historial local
    useEffect(() => {
        const loadHistory = async () => {
            const saved = await AsyncStorage.getItem('combineti_history');
            if (saved) setHistory(JSON.parse(saved));
        };
        loadHistory();
    }, []);

    // useEffect para llamar a la función de la API al montar el componente (con cache)
    useEffect(() => {
        fetchImportantMatches();
    }, []);

    // Funciones de persistencia del historial (sin cambios)
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

        const faqContent = `## ¿Qué hace la IA de Combineti?\nNuestra Inteligencia Artificial analiza millones de datos históricos, variables de juego recientes, y patrones ocultos para calcular la probabilidad más alta de resultados complejos, ofreciéndote combinadas optimizadas.\n\n## ¿Puedo confiar ciegamente en las predicciones?\nNo. La IA es una herramienta estadística avanzada. Las apuestas deportivas son intrínsecamente riesgosas y están sujetas a eventos inesperados. Usa Combineti como una guía informada, nunca como una garantía de ganancias.\n\n## ¿Cómo funciona el historial?\nTu historial se guarda localmente en tu dispositivo usando AsyncStorage. Esto asegura tu privacidad, ya que no recopilamos tus datos personales ni tus apuestas. Si desinstalas la app, el historial se perderá.\n\n## ¿Por qué a veces la carga es instantánea?\nImplementamos un sistema de caché con un Tiempo de Vida (TTL) de ${CACHE_TTL_MINUTES} minutos. Si vuelves a abrir la aplicación dentro de ese tiempo, cargamos la información guardada localmente para evitar agotar el límite de la API y darte una experiencia más rápida.`;


        switch (screen) {
            case 'home':
                // Pasamos el nuevo estado de lastFetch al HomeScreen
                return <HomeScreen
                    matches={matches}
                    onSelectMatch={handleMatchSelect}
                    isLoading={isLoading}
                    error={error}
                    lastFetch={lastFetch}
                />;
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
                return <HomeScreen
                    matches={matches}
                    onSelectMatch={handleMatchSelect}
                    isLoading={isLoading}
                    error={error}
                    lastFetch={lastFetch}
                />;
        }
    };

    return (
        // Contenedor principal de React Native
        <SafeAreaView style={tw`flex-1 bg-slate-900`} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {/* Header Flotante con estilo de elevación más llamativo */}
            <View style={tw`bg-slate-900 border-b border-slate-800/80 px-4 h-18 flex-row items-center justify-between z-30 shadow-2xl shadow-black/80`}>
                <TouchableOpacity onPress={() => navigate('home')} activeOpacity={0.8}>
                    <Text style={tw`font-black text-2xl italic tracking-widest text-white`}>COMBINETI</Text>
                </TouchableOpacity>
                {/* Botón de Menú para abrir el Sidebar (a la derecha) */}
                <TouchableOpacity onPress={() => setSidebarOpen(true)} style={tw`p-2 -mr-2 active:bg-slate-800 rounded-lg`}>
                    <Menu color="white" size={28} />
                </TouchableOpacity>
            </View>

            {/* Contenido de la Pantalla */}
            <View style={tw`flex-1 bg-slate-950`}>
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
        <SafeAreaProvider>
            <MainApp />
        </SafeAreaProvider>
    );
}