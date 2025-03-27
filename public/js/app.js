// API Configuration
const API_URL = 'http://localhost:3005/api';
axios.defaults.baseURL = API_URL;

// React Hooks
const { useState, useEffect, useContext } = React;

// Utility Functions
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

// Context for Authentication
const AuthContext = React.createContext(null);

// Auth Provider Component
const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUserData = localStorage.getItem('userData');

            if (storedToken && storedUserData) {
                const userData = JSON.parse(storedUserData);
                setToken(storedToken);
                setUser(userData);
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const updateUserContext = (userData) => {
        setUser(userData);
        localStorage.setItem('userData', JSON.stringify(userData));
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post('/auth/login', { email, password });
            
            if (!response.data || !response.data.token) {
                throw new Error('Dados de autenticação inválidos');
            }

            const { token: newToken, user: userData } = response.data;
            
            const userObject = {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                company: userData.company,
                isAdmin: userData.isAdmin,
                isApproved: userData.isApproved,
                isBlocked: userData.isBlocked
            };

            // Verificações de status do usuário com mensagens mais amigáveis
            if (!userObject.isApproved && !userObject.isAdmin) {
                throw new Error('Sua conta ainda está em análise. Por favor, aguarde a aprovação do administrador.');
            }

            if (userObject.isBlocked) {
                throw new Error('Sua conta está temporariamente bloqueada. Entre em contato com o administrador para mais informações.');
            }

            setToken(newToken);
            setUser(userObject);
            localStorage.setItem('token', newToken);
            localStorage.setItem('userData', JSON.stringify(userObject));
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            
            return userObject;
        } catch (error) {
            let errorMessage;
            
            if (error.response) {
                // Erros específicos do servidor
                switch (error.response.status) {
                    case 401:
                        errorMessage = 'Email ou senha incorretos. Por favor, verifique suas credenciais.';
                        break;
                    case 403:
                        errorMessage = error.response.data.message || 'Acesso não autorizado. Verifique o status da sua conta.';
                        break;
                    default:
                        errorMessage = error.response.data.message || 'Ocorreu um erro durante o login. Tente novamente.';
                }
            } else if (error.message) {
                // Erros personalizados ou de validação
                errorMessage = error.message;
            } else {
                // Erro genérico
                errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
            }
            
            throw new Error(errorMessage);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        delete axios.defaults.headers.common['Authorization'];
    };

    if (loading) {
        return <div className="spinner-overlay"><div className="spinner-border text-primary"></div></div>;
    }

    return (
        <AuthContext.Provider value={{ token, user, login, logout, updateUserContext }}>
            {children}
        </AuthContext.Provider>
    );
};

// Register Component
const Register = ({ setShowRegister }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        company: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post('/auth/register', formData);
            setRegistrationSuccess(true);
        } catch (error) {
            const errorMessage = error.response && error.response.data && error.response.data.message 
                ? error.response.data.message 
                : 'Erro ao registrar usuário. Por favor, tente novamente.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-6">
                            <div className="text-center mb-4">
                                <h1 className="display-4 fw-bold text-primary mb-0" style={{ letterSpacing: '0.5px' }}>
                                    C<span style={{ fontSize: '0.8em' }}>&</span>D
                                </h1>
                                <h2 className="h4 text-muted mt-2">Estoque</h2>
                            </div>

                            <div className="card shadow-sm border-0">
                                <div className="card-body p-4 text-center">
                                    <i className="fas fa-check-circle text-success mb-3" style={{ fontSize: '4rem' }}></i>
                                    <h3 className="mb-3">Registro Realizado com Sucesso!</h3>
                                    <p className="text-muted mb-4">
                                        Sua conta foi criada e está aguardando aprovação do administrador. 
                                        Você receberá uma notificação quando sua conta for aprovada.
                                    </p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowRegister(false)}
                                    >
                                        <i className="fas fa-sign-in-alt me-2"></i>
                                        Voltar para Login
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="text-center mb-4">
                            <h1 className="display-4 fw-bold text-primary mb-0" style={{ letterSpacing: '0.5px' }}>
                                C<span style={{ fontSize: '0.8em' }}>&</span>D
                            </h1>
                            <h2 className="h4 text-muted mt-2">Estoque</h2>
                            <p className="text-muted">Sistema de Gestão de Estoque</p>
                        </div>

                        <div className="card shadow-sm border-0">
                            <div className="card-body p-4">
                                <h3 className="text-center mb-4 fw-normal">Criar Conta</h3>

                                {error && (
                                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                        <i className="fas fa-exclamation-circle me-2"></i>
                                        {error}
                                        <button type="button" className="btn-close" onClick={() => setError('')}></button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="form-floating mb-3">
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="name"
                                            placeholder="Seu nome"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            required
                                        />
                                        <label htmlFor="name">Nome</label>
                                    </div>

                                    <div className="form-floating mb-3">
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="email"
                                            placeholder="nome@exemplo.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            required
                                        />
                                        <label htmlFor="email">Email</label>
                                    </div>

                                    <div className="form-floating mb-3">
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="password"
                                            placeholder="Senha"
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            required
                                        />
                                        <label htmlFor="password">Senha</label>
                                    </div>

                                    <div className="form-floating mb-4">
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="company"
                                            placeholder="Nome da empresa"
                                            value={formData.company}
                                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                                            required
                                        />
                                        <label htmlFor="company">Empresa</label>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="btn btn-primary w-100 py-2 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        ) : (
                                            <i className="fas fa-user-plus me-2"></i>
                                        )}
                                        Criar Conta
                                    </button>

                                    <div className="text-center">
                                        <button 
                                            type="button" 
                                            className="btn btn-link text-decoration-none"
                                            onClick={() => setShowRegister(false)}
                                        >
                                            Já tem uma conta? Faça login
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="text-center mt-4">
                            <small className="text-muted">
                                &copy; {new Date().getFullYear()} C&D Estoque. Todos os direitos reservados.
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Login Component
const Login = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData.email, formData.password);
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message || 'Ocorreu um erro durante o login. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (showRegister) {
        return <Register setShowRegister={setShowRegister} />;
    }

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-4">
                        <div className="text-center mb-4">
                            <h1 className="display-4 fw-bold text-primary mb-0" style={{ letterSpacing: '0.5px' }}>
                                C<span style={{ fontSize: '0.8em' }}>&</span>D
                            </h1>
                            <h2 className="h4 text-muted mt-2">Estoque</h2>
                            <p className="text-muted">Sistema de Gestão de Estoque</p>
                        </div>
                        
                        <div className="card shadow-sm border-0">
                            <div className="card-body p-4">
                                <h3 className="text-center mb-4 fw-normal">Login</h3>
                                
                                {error && (
                                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                        <div className="d-flex align-items-center">
                                            <i className="fas fa-exclamation-circle me-2"></i>
                                            <div className="flex-grow-1">{error}</div>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn-close" 
                                            onClick={() => setError('')}
                                            aria-label="Fechar"
                                        ></button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="form-floating mb-3">
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="email"
                                            placeholder="nome@exemplo.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                        <label htmlFor="email">Email</label>
                                    </div>

                                    <div className="form-floating mb-4">
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="password"
                                            placeholder="Senha"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                        <label htmlFor="password">Senha</label>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="btn btn-primary w-100 py-2 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        ) : (
                                            <i className="fas fa-sign-in-alt me-2"></i>
                                        )}
                                        {loading ? 'Entrando...' : 'Entrar'}
                                    </button>

                                    <div className="text-center">
                                        <button 
                                            type="button" 
                                            className="btn btn-link text-decoration-none"
                                            onClick={() => setShowRegister(true)}
                                        >
                                            Não tem uma conta? Registre-se
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        
                        <div className="text-center mt-4">
                            <small className="text-muted">
                                &copy; {new Date().getFullYear()} C&D Estoque. Todos os direitos reservados.
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Category Modal Component
const CategoryModal = ({ show, onHide, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({ name: '' });
        onHide();
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Nova Categoria</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Nome da Categoria</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Update Product Modal Component
const ProductModal = ({ show, onHide, product, categories, onSubmit }) => {
    const [formData, setFormData] = useState(product || {
        name: '',
        description: '',
        price: '',
        quantity: '',
        category: ''
    });

    useEffect(() => {
        if (product) {
            setFormData({
                ...product,
                price: product.price.toString()
            });
        }
    }, [product]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            price: parseFloat(formData.price)
        });
        onHide();
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h5 className="modal-title">{product ? 'Editar Produto' : 'Novo Produto'}</h5>
                    <button type="button" className="btn-close" onClick={onHide}></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="mb-3">
                            <label className="form-label">Nome</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Descrição</label>
                            <textarea
                                className="form-control"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Preço</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Quantidade</label>
                            <input
                                type="number"
                                className="form-control"
                                value={formData.quantity}
                                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Categoria</label>
                            <select
                                className="form-select"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                required
                            >
                                <option value="">Selecione uma categoria</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.name}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Movement Modal Component
const MovementModal = ({ show, onHide, products, onSubmit }) => {
    const [formData, setFormData] = useState({
        productId: '',
        type: 'entrada',
        quantity: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            productId: parseInt(formData.productId),
            quantity: parseInt(formData.quantity)
        });
        onHide();
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Nova Movimentação</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Produto</label>
                                <select
                                    className="form-select"
                                    value={formData.productId}
                                    onChange={(e) => setFormData({...formData, productId: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione um produto</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} - Estoque: {product.quantity}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Tipo</label>
                                <select
                                    className="form-select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    required
                                >
                                    <option value="entrada">Entrada</option>
                                    <option value="saida">Saída</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Quantidade</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-control"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onHide}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Registrar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// User Details Modal Component
const UserDetailsModal = ({ show, onHide, user }) => {
    if (!user) return null;

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Detalhes do Usuário</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <div className="row">
                            <div className="col-md-4 text-center mb-4">
                                <div 
                                    className="avatar-circle mx-auto mb-3" 
                                    style={{ 
                                        backgroundColor: stringToColor(user.name),
                                        width: '120px',
                                        height: '120px',
                                        fontSize: '3rem'
                                    }}
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <h4>{user.name}</h4>
                                <span className="badge bg-info text-dark mb-2">{user.company}</span>
                                <div className="mt-2">
                                    {!user.isApproved && (
                                        <span className="badge bg-warning text-dark d-block mb-1">
                                            <i className="fas fa-clock me-1"></i>
                                            Pendente
                                        </span>
                                    )}
                                    {user.isApproved && !user.isBlocked && (
                                        <span className="badge bg-success d-block mb-1">
                                            <i className="fas fa-check me-1"></i>
                                            Ativo
                                        </span>
                                    )}
                                    {user.isBlocked && (
                                        <span className="badge bg-danger d-block mb-1">
                                            <i className="fas fa-ban me-1"></i>
                                            Bloqueado
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="col-md-8">
                                <div className="card mb-3">
                                    <div className="card-body">
                                        <h6 className="card-subtitle mb-3 text-muted">Informações Básicas</h6>
                                        <dl className="row mb-0">
                                            <dt className="col-sm-4">ID</dt>
                                            <dd className="col-sm-8">{user.id}</dd>

                                            <dt className="col-sm-4">Email</dt>
                                            <dd className="col-sm-8">{user.email}</dd>

                                            <dt className="col-sm-4">Empresa</dt>
                                            <dd className="col-sm-8">{user.company}</dd>

                                            <dt className="col-sm-4">Data de Registro</dt>
                                            <dd className="col-sm-8">
                                                {new Date(user.createdAt).toLocaleDateString()} às {new Date(user.createdAt).toLocaleTimeString()}
                                            </dd>

                                            <dt className="col-sm-4">Último Acesso</dt>
                                            <dd className="col-sm-8">
                                                {user.lastLogin ? (
                                                    `${new Date(user.lastLogin).toLocaleDateString()} às ${new Date(user.lastLogin).toLocaleTimeString()}`
                                                ) : (
                                                    'Nunca acessou'
                                                )}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="card-body">
                                        <h6 className="card-subtitle mb-3 text-muted">Ações</h6>
                                        <div className="d-flex gap-2">
                                            {!user.isApproved && (
                                                <button
                                                    className="btn btn-success"
                                                    onClick={() => handleStatusChange(user.id, 'approve')}
                                                >
                                                    <i className="fas fa-check me-2"></i>
                                                    Aprovar Usuário
                                                </button>
                                            )}
                                            <button
                                                className={`btn btn-${user.isBlocked ? 'warning' : 'danger'}`}
                                                onClick={() => handleStatusChange(user.id, user.isBlocked ? 'unblock' : 'block')}
                                            >
                                                <i className={`fas fa-${user.isBlocked ? 'unlock' : 'ban'} me-2`}></i>
                                                {user.isBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => {
                                                    if (confirm('Tem certeza que deseja excluir este usuário?')) {
                                                        handleDeleteUser(user.id);
                                                        onHide();
                                                    }
                                                }}
                                            >
                                                <i className="fas fa-trash me-2"></i>
                                                Excluir Usuário
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onHide}>Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Update Dashboard Component
const Dashboard = () => {
    const { token, user, logout } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [movements, setMovements] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);

    const fetchData = async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Ensure the token is set in axios headers
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const [statsRes, productsRes, categoriesRes, movementsRes] = await Promise.all([
                axios.get('/movements/stats'),
                axios.get('/products'),
                axios.get('/categories'),
                axios.get('/movements')
            ]);

            // Only update state if the component is still mounted and we have a token
            if (token) {
                setStats(statsRes.data);
                setProducts(productsRes.data);
                setCategories(categoriesRes.data);
                setMovements(movementsRes.data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            if (error.response && error.response.status === 401) {
                logout();
            } else {
                setError('Erro ao carregar dados. Por favor, tente novamente.');
            }
        } finally {
            if (token) {
                setLoading(false);
            }
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/auth/users');
            setUsers(response.data);
        } catch (error) {
            setError('Erro ao carregar usuários');
            console.error('Error fetching users:', error);
        }
    };

    const handleStatusChange = async (userId, action) => {
        try {
            await axios.put(`/auth/users/${userId}/${action}`);
            setSuccessMessage(`Usuário ${action} com sucesso!`);
            fetchUsers();
            
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        } catch (error) {
            const errorMessage = error.response && error.response.data && error.response.data.message 
                ? error.response.data.message 
                : 'Erro ao atualizar usuário';
            setError(errorMessage);
            console.error('Error updating user:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
        
        try {
            await axios.delete(`/auth/users/${userId}`);
            setSuccessMessage('Usuário excluído com sucesso!');
            fetchUsers();
            
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        } catch (error) {
            const errorMessage = error.response && error.response.data && error.response.data.message 
                ? error.response.data.message 
                : 'Erro ao excluir usuário';
            setError(errorMessage);
            console.error('Error deleting user:', error);
        }
    };

    useEffect(() => {
        let mounted = true;

        if (token && mounted) {
            fetchData();
            if (user && user.isAdmin) {
                fetchUsers();
            }
        }

        return () => {
            mounted = false;
        };
    }, [token]);

    useEffect(() => {
        // Verifica a rota atual
        const path = window.location.pathname;
        if (path === '/buscar') {
            setCurrentPage('search');
        }
    }, []);

    const handleCategorySubmit = async (formData) => {
        try {
            await axios.post('/categories', formData);
            fetchData();
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
        }
    };

    const handleProductSubmit = async (formData) => {
        try {
            if (selectedProduct) {
                await axios.put(`/products/${selectedProduct.id}`, formData);
            } else {
                await axios.post('/products', formData);
            }
            fetchData();
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
        }
    };

    const handleMovementSubmit = async (formData) => {
        try {
            await axios.post('/movements', formData);
            fetchData();
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await axios.delete(`/products/${id}`);
                fetchData();
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
            }
        }
    };

    const handleViewUserDetails = (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setSelectedUser(user);
            setShowUserDetailsModal(true);
        }
    };

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderAdminPanel = () => {
        // Calcular estatísticas dos usuários
        const totalUsers = users.length;
        const pendingUsers = users.filter(user => !user.isApproved).length;
        const blockedUsers = users.filter(user => user.isBlocked).length;
        const activeUsers = users.filter(user => user.isApproved && !user.isBlocked).length;

        return (
            <div className="container-fluid py-4">
                {/* Cards de Estatísticas */}
                <div className="row mb-4">
                    <div className="col-xl-3 col-md-6 mb-4">
                        <div className="card border-left-primary shadow h-100 py-2">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                            Total de Usuários
                                        </div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{totalUsers}</div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="fas fa-users fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-md-6 mb-4">
                        <div className="card border-left-warning shadow h-100 py-2">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                            Pendentes
                                        </div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{pendingUsers}</div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="fas fa-clock fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-md-6 mb-4">
                        <div className="card border-left-success shadow h-100 py-2">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                                            Ativos
                                        </div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{activeUsers}</div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="fas fa-check-circle fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-md-6 mb-4">
                        <div className="card border-left-danger shadow h-100 py-2">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                                            Bloqueados
                                        </div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{blockedUsers}</div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="fas fa-ban fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alertas e Mensagens */}
                {error && (
                    <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                        <div className="d-flex align-items-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            <div className="flex-grow-1">{error}</div>
                        </div>
                        <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Fechar"></button>
                    </div>
                )}
                
                {successMessage && (
                    <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                        <div className="d-flex align-items-center">
                            <i className="fas fa-check-circle me-2"></i>
                            <div className="flex-grow-1">{successMessage}</div>
                        </div>
                        <button type="button" className="btn-close" onClick={() => setSuccessMessage('')} aria-label="Fechar"></button>
                    </div>
                )}

                {/* Tabela de Usuários */}
                <div className="card shadow mb-4">
                    <div className="card-header py-3 d-flex flex-wrap justify-content-between align-items-center">
                        <h6 className="m-0 font-weight-bold text-primary">Gerenciamento de Usuários</h6>
                        <div className="d-flex gap-2">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="fas fa-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar usuários..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => fetchUsers()}
                                title="Atualizar lista"
                            >
                                <i className="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Empresa</th>
                                        <th>Status</th>
                                        <th>Último Acesso</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.filter(user => 
                                        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        user.company.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="avatar-circle me-2" style={{ backgroundColor: stringToColor(user.name) }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold">{user.name}</div>
                                                        <small className="text-muted">ID: {user.id}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{user.email}</td>
                                            <td>
                                                <span className="badge bg-info text-dark">
                                                    {user.company}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column gap-1">
                                                    {!user.isApproved && (
                                                        <span className="badge bg-warning text-dark">
                                                            <i className="fas fa-clock me-1"></i>
                                                            Pendente
                                                        </span>
                                                    )}
                                                    {user.isApproved && !user.isBlocked && (
                                                        <span className="badge bg-success">
                                                            <i className="fas fa-check me-1"></i>
                                                            Ativo
                                                        </span>
                                                    )}
                                                    {user.isBlocked && (
                                                        <span className="badge bg-danger">
                                                            <i className="fas fa-ban me-1"></i>
                                                            Bloqueado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    {new Date(user.lastLogin || user.createdAt).toLocaleDateString()}
                                                    <small className="d-block text-muted">
                                                        {new Date(user.lastLogin || user.createdAt).toLocaleTimeString()}
                                                    </small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="btn-group">
                                                    {!user.isApproved && (
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleStatusChange(user.id, 'approve')}
                                                            title="Aprovar usuário"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                    )}
                                                    <button
                                                        className={`btn btn-${user.isBlocked ? 'warning' : 'danger'} btn-sm`}
                                                        onClick={() => handleStatusChange(user.id, user.isBlocked ? 'unblock' : 'block')}
                                                        title={user.isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                                                    >
                                                        <i className={`fas fa-${user.isBlocked ? 'unlock' : 'ban'}`}></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-info btn-sm"
                                                        onClick={() => handleViewUserDetails(user.id)}
                                                        title="Ver detalhes"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        title="Excluir usuário"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {users.length === 0 && (
                            <div className="text-center py-5">
                                <i className="fas fa-users fa-3x text-muted mb-3"></i>
                                <p className="text-muted">Nenhum usuário encontrado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gráficos e Estatísticas */}
                <div className="row">
                    <div className="col-xl-6 mb-4">
                        <div className="card shadow h-100">
                            <div className="card-header py-3">
                                <h6 className="m-0 font-weight-bold text-primary">Distribuição de Status</h6>
                            </div>
                            <div className="card-body">
                                <div className="chart-pie pt-4">
                                    {/* Aqui você pode adicionar um gráfico de pizza mostrando a distribuição dos status */}
                                    <div className="mt-4 text-center small">
                                        <span className="me-2">
                                            <i className="fas fa-circle text-success"></i> Ativos
                                        </span>
                                        <span className="me-2">
                                            <i className="fas fa-circle text-warning"></i> Pendentes
                                        </span>
                                        <span>
                                            <i className="fas fa-circle text-danger"></i> Bloqueados
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-6 mb-4">
                        <div className="card shadow h-100">
                            <div className="card-header py-3">
                                <h6 className="m-0 font-weight-bold text-primary">Registros por Período</h6>
                            </div>
                            <div className="card-body">
                                <div className="chart-area">
                                    {/* Aqui você pode adicionar um gráfico de linha mostrando registros ao longo do tempo */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRegularDashboard = () => {
        // Calcular o valor total dos produtos
        const totalValue = products.reduce((total, product) => {
            return total + (product.price * product.quantity);
        }, 0);

        return (
            <div className="container-fluid py-4">
                <div className="d-flex flex-wrap gap-2 mb-4">
                    <button 
                        className="btn btn-info" 
                        onClick={() => setShowCategoryModal(true)}
                    >
                        <i className="fas fa-tags me-2"></i>
                        Gerenciar Categorias
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => {
                            setSelectedProduct(null);
                            setShowProductModal(true);
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Novo Produto
                    </button>
                    <button 
                        className="btn btn-success" 
                        onClick={() => setShowMovementModal(true)}
                    >
                        <i className="fas fa-exchange-alt me-2"></i>
                        Nova Movimentação
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                            window.history.pushState({}, '', '/buscar');
                            setCurrentPage('search');
                        }}
                    >
                        <i className="fas fa-search me-2"></i>
                        Buscar Produtos
                    </button>
                </div>
                
                <div className="row stats mb-4">
                    <div className="col-xl-3 col-md-6">
                        <div className="stats-card products position-relative">
                            <div>
                                <div className="number">{products.length}</div>
                                <div className="label">Total de Produtos</div>
                            </div>
                            <i className="fas fa-box icon"></i>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="stats-card inputs position-relative">
                            <div>
                                <div className="number">{stats && stats.totalEntradas ? stats.totalEntradas : 0}</div>
                                <div className="label">Entradas</div>
                            </div>
                            <i className="fas fa-arrow-circle-down icon"></i>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="stats-card outputs position-relative">
                            <div>
                                <div className="number">{stats && stats.totalSaidas ? stats.totalSaidas : 0}</div>
                                <div className="label">Saídas</div>
                            </div>
                            <i className="fas fa-arrow-circle-up icon"></i>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="stats-card balance position-relative">
                            <div>
                                <div className="number">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="label">Valor Total em Estoque</div>
                            </div>
                            <i className="fas fa-dollar-sign icon"></i>
                        </div>
                    </div>
                </div>

                <div className="row mt-4">
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                                <h5 className="card-title mb-0">Produtos</h5>
                                <div className="d-flex align-items-center w-100 w-md-auto">
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="fas fa-search"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Buscar produtos..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <span className="badge bg-primary ms-2">{filteredProducts.length}</span>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                <div className="product-list">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="product-item p-3 border-bottom">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="product-info">
                                                    <h6 className="mb-1">{product.name}</h6>
                                                    <span className="badge bg-secondary mb-2">{product.category}</span>
                                                    <div className="product-details">
                                                        <div className="mb-1">
                                                            <strong>Preço:</strong> R$ {parseFloat(product.price).toFixed(2)}
                                                        </div>
                                                        <div className="d-flex align-items-center">
                                                            <strong>Estoque:</strong>
                                                            <span className={`badge ms-2 bg-${product.quantity > 10 ? 'success' : product.quantity > 5 ? 'warning' : 'danger'}`}>
                                                                {product.quantity} unidades
                                                            </span>
                                                        </div>
                                                        {product.quantity <= 5 && (
                                                            <div className="text-danger mt-1">
                                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                                Estoque Baixo
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="product-actions d-flex flex-column gap-2">
                                                    <button 
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setShowProductModal(true);
                                                        }}
                                                    >
                                                        <i className="fas fa-edit me-1"></i>
                                                        Editar
                                                    </button>
                                                    <button 
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                    >
                                                        <i className="fas fa-trash me-1"></i>
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <div className="text-center p-4">
                                            <i className="fas fa-box fa-3x text-muted mb-3 d-block"></i>
                                            <p className="text-muted">Nenhum produto encontrado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">Últimas Movimentações</h5>
                                <span className="badge bg-secondary">{movements.length} movimentações</span>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Produto</th>
                                                <th>Tipo</th>
                                                <th>Quantidade</th>
                                                <th>Data</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movements.map(movement => (
                                                <tr key={movement.id}>
                                                    <td>
                                                        <div>
                                                            <strong>{movement.product.name}</strong>
                                                            <small className="d-block text-muted">{movement.product.category}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge bg-${movement.type === 'entrada' ? 'success' : 'danger'}`}>
                                                            {movement.type === 'entrada' ? 'Entrada' : 'Saída'}
                                                        </span>
                                                    </td>
                                                    <td>{movement.quantity}</td>
                                                    <td>
                                                        <div>
                                                            {new Date(movement.createdAt).toLocaleDateString()}
                                                            <small className="d-block text-muted">
                                                                {new Date(movement.createdAt).toLocaleTimeString()}
                                                            </small>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'search':
                return <ProductSearch />;
            default:
                return (
                    <div className="container-fluid py-4">
                        {user && user.isAdmin ? renderAdminPanel() : renderRegularDashboard()}
                    </div>
                );
        }
    };

    if (loading) {
        return <div className="spinner-overlay"><div className="spinner-border text-primary"></div></div>;
    }

    return (
        <React.Fragment>
            {renderContent()}
            <ProductModal
                show={showProductModal}
                onHide={() => setShowProductModal(false)}
                product={selectedProduct}
                categories={categories}
                onSubmit={handleProductSubmit}
            />

            <CategoryModal
                show={showCategoryModal}
                onHide={() => setShowCategoryModal(false)}
                onSubmit={handleCategorySubmit}
            />

            <MovementModal
                show={showMovementModal}
                onHide={() => setShowMovementModal(false)}
                products={products}
                onSubmit={handleMovementSubmit}
            />

            <UserDetailsModal
                show={showUserDetailsModal}
                onHide={() => {
                    setShowUserDetailsModal(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
            />
        </React.Fragment>
    );
};

// Main App Component
const App = () => {
    const { token, user, logout } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState('dashboard');

    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/buscar') {
            setCurrentPage('search');
        }
    }, []);

    if (!token) {
        return <Login />;
    }

    return (
        <div>
            <nav className="navbar navbar-dark bg-primary">
                <div className="container-fluid">
                    <a className="navbar-brand d-flex align-items-center" href="/">
                        <span className="fw-bold" style={{ fontSize: '1.4rem', letterSpacing: '0.5px' }}>
                            C<span style={{ fontSize: '1.2rem' }}>&</span>D
                            <span style={{ marginLeft: '8px', fontWeight: '400' }}>Estoque</span>
                        </span>
                    </a>
                    <div className="d-flex gap-2">
                        {user && user.isAdmin && (
                            <button 
                                className="btn btn-outline-light" 
                                onClick={() => setCurrentPage('admin')}
                            >
                                <i className="fas fa-users-cog me-2"></i>
                                Painel Admin
                            </button>
                        )}
                        <button 
                            className="btn btn-outline-light" 
                            onClick={logout}
                        >
                            <i className="fas fa-sign-out-alt me-2"></i>
                            Sair
                        </button>
                    </div>
                </div>
            </nav>
            {user && user.isAdmin && currentPage === 'admin' ? (
                <Dashboard />
            ) : (
                <Dashboard />
            )}
        </div>
    );
};

// Render the app
ReactDOM.render(
    <AuthProvider>
        <App />
    </AuthProvider>,
    document.getElementById('root')
); 