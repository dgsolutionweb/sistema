// API Configuration
const API_URL = 'https://strongzonefit.com/api';
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
    const [companyName, setCompanyName] = useState('');
    const [activeTab, setActiveTab] = useState('products');
    const [saleItems, setSaleItems] = useState([]);
    const [selectedSaleProduct, setSelectedSaleProduct] = useState(null);
    const [saleItemQuantity, setSaleItemQuantity] = useState(1);
    const [currentDiscount, setCurrentDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('dinheiro');
    const [selectedClient, setSelectedClient] = useState(null);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [sales, setSales] = useState([]);
    const [clients, setClients] = useState([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [filteredSaleProducts, setFilteredSaleProducts] = useState([]);
    // Novos estados para gerenciamento de clientes
    const [showClientOptionsModal, setShowClientOptionsModal] = useState(false);
    const [showClientsListModal, setShowClientsListModal] = useState(false);
    const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
    const [viewingClient, setViewingClient] = useState(null);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [filteredClients, setFilteredClients] = useState([]);

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

            const [statsRes, productsRes, categoriesRes, movementsRes, clientsRes] = await Promise.all([
                axios.get('/movements/stats'),
                axios.get('/products'),
                axios.get('/categories'),
                axios.get('/movements'),
                axios.get('/clients')
            ]);

            // Obter vendas com detalhes completos
            const salesRes = await axios.get('/sales?include=client');

            // Only update state if the component is still mounted and we have a token
            if (token) {
                setStats(statsRes.data);
                setProducts(productsRes.data);
                setCategories(categoriesRes.data);
                setMovements(movementsRes.data);
                setSales(salesRes.data);
                setClients(clientsRes.data);
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

    useEffect(() => {
        // Carregar o nome da empresa
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && userData.company) {
            setCompanyName(userData.company);
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

    const handleClientSubmit = async (formData) => {
        try {
            if (selectedClient) {
                await axios.put(`/clients/${selectedClient.id}`, formData);
            } else {
                await axios.post('/clients', formData);
            }
            fetchData();
            setShowClientModal(false);
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            setError(error.response && error.response.data ? error.response.data.message : 'Erro ao salvar cliente');
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

    const handleDeleteClient = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await axios.delete(`/clients/${id}`);
                setSuccessMessage('Cliente excluído com sucesso!');
                fetchData();
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                setError(error.response && error.response.data ? error.response.data.message : 'Erro ao excluir cliente');
            }
        }
    };

    const handleOpenNewClient = () => {
        setSelectedClient(null);
        setShowClientOptionsModal(false);
        setShowClientModal(true);
    };

    const handleOpenClientsList = () => {
        setShowClientOptionsModal(false);
        setShowClientsListModal(true);
    };

    const handleViewClient = (client) => {
        setViewingClient(client);
        setShowClientDetailsModal(true);
    };

    const handleEditClient = (client) => {
        setSelectedClient(client);
        setShowClientsListModal(false);
        setShowClientModal(true);
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

    // Funções para o PDV
    const calculateSubtotal = () => {
        return saleItems.reduce((total, item) => total + item.total, 0);
    };

    const finalizeSale = async () => {
        if (saleItems.length === 0) return;
        
        try {
            setLoading(true);
            
            const saleData = {
                items: saleItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                })),
                discount: currentDiscount,
                total: calculateSubtotal() - currentDiscount,
                clientId: selectedClient ? selectedClient.id : null,
                paymentMethod: paymentMethod
            };
            
            const response = await axios.post('/sales', saleData);
            
            // Atualizar lista de produtos (para refletir o estoque atualizado)
            fetchData();
            
            // Limpar formulário
            setSaleItems([]);
            setSelectedSaleProduct(null);
            setCurrentDiscount(0);
            setPaymentMethod('dinheiro');
            setSelectedClient(null);
            setClientSearchTerm('');
            setProductSearchTerm('');
            setFilteredSaleProducts([]);
            setFilteredClients([]);
            
            // Exibir mensagem de sucesso
            setSuccessMessage('Venda finalizada com sucesso!');
            setTimeout(() => setSuccessMessage(''), 3000);
            
            // Exibir comprovante
            viewSaleReceipt(response.data.id);
            
        } catch (error) {
            console.error('Erro ao finalizar venda:', error);
            setError('Erro ao finalizar venda. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const viewSaleReceipt = async (saleId) => {
        try {
            setLoading(true);
            const response = await axios.get(`/sales/${saleId}`);
            setSelectedSale(response.data);
            setShowReceiptModal(true);
        } catch (error) {
            console.error('Erro ao buscar detalhes da venda:', error);
            setError('Erro ao buscar detalhes da venda');
        } finally {
            setLoading(false);
        }
    };

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
                    <button 
                        className="btn btn-warning" 
                        onClick={() => setActiveTab('sales')}
                    >
                        <i className="fas fa-shopping-cart me-2"></i>
                        PDV
                    </button>
                    <button 
                        className="btn btn-dark" 
                        onClick={() => setActiveTab('reports')}
                    >
                        <i className="fas fa-chart-bar me-2"></i>
                        Relatórios
                    </button>
                    <button 
                        className="btn btn-info" 
                        onClick={() => {
                            setSelectedClient(null);
                            setShowClientOptionsModal(true);
                        }}
                    >
                        <i className="fas fa-user-plus me-2"></i>
                        Gerenciar Clientes
                    </button>
                </div>
                
                {activeTab === 'products' && (
                    <div>
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
                )}
                
                {activeTab === 'sales' && (
                    <div>
                        <div className="mb-4 d-flex justify-content-between align-items-center">
                            <h4>PDV - Ponto de Venda</h4>
                            <button 
                                className="btn btn-success" 
                                id="newSaleBtn"
                                onClick={() => {
                                    // Limpar formulário de venda
                                    setSaleItems([]);
                                    setSelectedSaleProduct(null);
                                    setCurrentDiscount(0);
                                    setPaymentMethod('dinheiro');
                                }}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Nova Venda
                            </button>
                        </div>
                        
                        <div className="row">
                            <div className="col-md-8">
                                <div className="card mb-4">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Itens da Venda</h5>
                                    </div>
                                    <div className="card-body">
                                        <form id="saleForm" className="mb-4" onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!selectedSaleProduct) return;
                                            
                                            // Verificar se já existe o produto na lista
                                            const existingItemIndex = saleItems.findIndex(item => item.productId === selectedSaleProduct.id);
                                            
                                            if (existingItemIndex >= 0) {
                                                // Atualizar quantidade do item existente
                                                const newItems = [...saleItems];
                                                newItems[existingItemIndex].quantity += parseInt(saleItemQuantity);
                                                newItems[existingItemIndex].total = newItems[existingItemIndex].quantity * newItems[existingItemIndex].price;
                                                setSaleItems(newItems);
                                            } else {
                                                // Adicionar novo item
                                                const newItem = {
                                                    productId: selectedSaleProduct.id,
                                                    productName: selectedSaleProduct.name,
                                                    productCategory: selectedSaleProduct.category,
                                                    price: parseFloat(selectedSaleProduct.price),
                                                    quantity: parseInt(saleItemQuantity),
                                                    total: parseFloat(selectedSaleProduct.price) * parseInt(saleItemQuantity)
                                                };
                                                setSaleItems([...saleItems, newItem]);
                                            }
                                            
                                            // Limpar formulário
                                            setSelectedSaleProduct(null);
                                            setSaleItemQuantity(1);
                                            setProductSearchTerm('');
                                            setFilteredSaleProducts([]);
                                            document.getElementById('saleForm').reset();
                                        }}>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label">Produto</label>
                                                    <div className="position-relative">
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Digite o nome do produto"
                                                            value={productSearchTerm}
                                                            onChange={(e) => {
                                                                setProductSearchTerm(e.target.value);
                                                                if (e.target.value.length > 2) {
                                                                    const filtered = products
                                                                        .filter(p => 
                                                                            p.quantity > 0 && 
                                                                            p.name.toLowerCase().includes(e.target.value.toLowerCase())
                                                                        )
                                                                        .slice(0, 5);
                                                                    setFilteredSaleProducts(filtered);
                                                                } else {
                                                                    setFilteredSaleProducts([]);
                                                                }
                                                            }}
                                                            required
                                                        />
                                                        {filteredSaleProducts.length > 0 && (
                                                            <div className="position-absolute w-100 mt-1 bg-white shadow rounded border" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                                                {filteredSaleProducts.map(product => (
                                                                    <div 
                                                                        key={product.id} 
                                                                        className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => {
                                                                            setSelectedSaleProduct(product);
                                                                            setProductSearchTerm(product.name);
                                                                            setFilteredSaleProducts([]);
                                                                        }}
                                                                    >
                                                                        <div className="fw-bold">{product.name}</div>
                                                                        <div className="small text-muted d-flex justify-content-between">
                                                                            <span>{product.category}</span>
                                                                            <span>R$ {parseFloat(product.price).toFixed(2)} | Estoque: {product.quantity}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">Quantidade</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control" 
                                                        min="1" 
                                                        value={saleItemQuantity}
                                                        onChange={(e) => setSaleItemQuantity(parseInt(e.target.value))}
                                                        max={selectedSaleProduct ? selectedSaleProduct.quantity : 1}
                                                        required
                                                    />
                                                </div>
                                                <div className="col-md-3 d-flex align-items-end">
                                                    <button 
                                                        type="submit" 
                                                        className="btn btn-primary w-100"
                                                        disabled={!selectedSaleProduct}
                                                    >
                                                        <i className="fas fa-cart-plus me-2"></i>
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                        
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Produto</th>
                                                        <th className="text-center">Preço</th>
                                                        <th className="text-center">Qtde</th>
                                                        <th className="text-center">Total</th>
                                                        <th className="text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {saleItems.map((item, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <div>
                                                                    <strong>{item.productName}</strong>
                                                                    <small className="d-block text-muted">{item.productCategory}</small>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">R$ {item.price.toFixed(2)}</td>
                                                            <td className="text-center">{item.quantity}</td>
                                                            <td className="text-center">R$ {item.total.toFixed(2)}</td>
                                                            <td className="text-center">
                                                                <button 
                                                                    className="btn btn-outline-danger btn-sm"
                                                                    onClick={() => {
                                                                        const newItems = saleItems.filter((_, i) => i !== index);
                                                                        setSaleItems(newItems);
                                                                    }}
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    
                                                    {saleItems.length === 0 && (
                                                        <tr>
                                                            <td colSpan="5" className="text-center py-3">
                                                                <p className="text-muted mb-0">Nenhum item adicionado</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="col-md-4">
                                <div className="card mb-4">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Resumo da Venda</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between mb-3">
                                            <span>Subtotal:</span>
                                            <span className="fw-bold">R$ {calculateSubtotal().toFixed(2)}</span>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <label className="form-label">Desconto</label>
                                            <div className="input-group">
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    placeholder="0,00" 
                                                    min="0"
                                                    value={currentDiscount}
                                                    onChange={(e) => setCurrentDiscount(parseFloat(e.target.value) || 0)}
                                                />
                                                <span className="input-group-text">R$</span>
                                            </div>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between mb-4">
                                            <span className="fw-bold fs-5">Total:</span>
                                            <span className="fw-bold fs-5 text-primary">R$ {(calculateSubtotal() - currentDiscount).toFixed(2)}</span>
                                        </div>
                                        
                                        <hr className="my-3" />
                                        
                                        <div className="mb-3">
                                            <label className="form-label">Cliente</label>
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Digite nome, CPF/CNPJ ou telefone do cliente..."
                                                    value={clientSearchTerm}
                                                    onChange={(e) => {
                                                        setClientSearchTerm(e.target.value);
                                                        if (e.target.value.length > 2) {
                                                            const filtered = clients
                                                                .filter(c => 
                                                                    c.name.toLowerCase().includes(e.target.value.toLowerCase()) || 
                                                                    (c.document && c.document.includes(e.target.value)) ||
                                                                    (c.phone && c.phone.includes(e.target.value)) ||
                                                                    (c.email && c.email.toLowerCase().includes(e.target.value.toLowerCase()))
                                                                )
                                                                .slice(0, 5);
                                                            setFilteredClients(filtered);
                                                        } else {
                                                            setFilteredClients([]);
                                                        }
                                                    }}
                                                />
                                                {filteredClients.length > 0 && (
                                                    <div className="position-absolute w-100 mt-1 bg-white shadow rounded border" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                                        {filteredClients.map(client => (
                                                            <div 
                                                                key={client.id} 
                                                                className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => {
                                                                    setSelectedClient(client);
                                                                    setClientSearchTerm(client.name);
                                                                    setFilteredClients([]);
                                                                }}
                                                            >
                                                                <div className="fw-bold">{client.name}</div>
                                                                <div className="small text-muted d-flex justify-content-between">
                                                                    <span>{client.document ? client.document : (client.email || '')}</span>
                                                                    <span>{client.phone || ''}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="form-label">Forma de Pagamento</label>
                                            <select 
                                                className="form-select"
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                            >
                                                <option value="dinheiro">Dinheiro</option>
                                                <option value="cartao_credito">Cartão de Crédito</option>
                                                <option value="cartao_debito">Cartão de Débito</option>
                                                <option value="pix">PIX</option>
                                                <option value="crediario">Crediário</option>
                                            </select>
                                        </div>
                                        
                                        <button 
                                            className="btn btn-success w-100 py-2"
                                            disabled={saleItems.length === 0}
                                            onClick={() => finalizeSale()}
                                        >
                                            <i className="fas fa-check-circle me-2"></i>
                                            Finalizar Venda
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="card">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Últimas Vendas</h5>
                                    </div>
                                    <div className="card-body p-0">
                                        <div className="list-group list-group-flush">
                                            {sales.map(sale => (
                                                <a key={sale.id} 
                                                href="#" 
                                                className="list-group-item list-group-item-action"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    viewSaleReceipt(sale.id);
                                                }}
                                                >
                                                    <div className="d-flex w-100 justify-content-between">
                                                        <h6 className="mb-1">Venda #{sale.id}</h6>
                                                        <small>R$ {parseFloat(sale.total).toFixed(2)}</small>
                                                    </div>
                                                    <p className="mb-1">
                                                        {sale.client && sale.client.name ? sale.client.name : (sale.clientName ? sale.clientName : 'Cliente não informado')}
                                                    </p>
                                                    <small className="text-muted">
                                                        {new Date(sale.createdAt).toLocaleString()}
                                                    </small>
                                                </a>
                                            ))}
                                            
                                            {sales.length === 0 && (
                                                <div className="text-center py-3">
                                                    <p className="text-muted mb-0">Nenhuma venda registrada</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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

            <ClientModal
                show={showClientModal}
                onHide={() => setShowClientModal(false)}
                client={selectedClient}
                onSubmit={handleClientSubmit}
            />

            <ClientOptionsModal
                show={showClientOptionsModal}
                onHide={() => setShowClientOptionsModal(false)}
                onNewClient={handleOpenNewClient}
                onListClients={handleOpenClientsList}
            />
            
            <ClientsListModal
                show={showClientsListModal}
                onHide={() => setShowClientsListModal(false)}
                clients={clients}
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
                onView={handleViewClient}
            />
            
            <ClientDetailsModal
                show={showClientDetailsModal}
                onHide={() => setShowClientDetailsModal(false)}
                client={viewingClient}
            />

            <SaleReceiptModal
                show={showReceiptModal}
                onHide={() => setShowReceiptModal(false)}
                sale={selectedSale}
            />
        </React.Fragment>
    );
};

// Main App Component
const App = () => {
    const { token, user, logout } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [companyName, setCompanyName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [publicLink, setPublicLink] = useState('');

    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/buscar') {
            setCurrentPage('search');
        }

        // Carregar o nome da empresa
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && userData.company) {
            setCompanyName(userData.company);
        }
    }, []);

    const handlePublicLinkClick = () => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            console.error('Usuário não encontrado');
            return;
        }

        const userId = userData.id;
        const link = `https://strongzonefit.com/products.html?company=${userId}`;
        setPublicLink(link);
        setShowModal(true);
    };

    const handleCopyClick = async () => {
        const success = await copyToClipboard(publicLink);
        if (success) {
            const copyBtn = document.getElementById('copyLinkBtn');
            if (copyBtn) {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                }, 2000);
            }
        }
    };

    if (!token) {
        return <Login />;
    }

    return (
        <div>
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
                <div className="container-fluid">
                    <a className="navbar-brand" href="#">{companyName}</a>
                    <div className="d-flex">
                        <button className="btn btn-outline-light me-2" onClick={handlePublicLinkClick} title="Gerar Link Público">
                            <i className="fas fa-share-alt"></i> Link Público
                        </button>
                        <button className="btn btn-outline-danger" onClick={logout}>
                            <i className="fas fa-sign-out-alt"></i> Sair
                        </button>
                    </div>
                </div>
            </nav>

            {/* Modal para Link Público */}
            <div className={`modal fade ${showModal ? 'show' : ''}`} 
                id="publicLinkModal" 
                style={{ display: showModal ? 'block' : 'none' }}
                tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Link Público dos Produtos</h5>
                            <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            <p>Compartilhe este link com seus clientes para que eles possam visualizar seus produtos:</p>
                            <div className="input-group mb-3">
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={publicLink} 
                                    readOnly
                                />
                                <button className="btn btn-outline-primary" onClick={handleCopyClick}>
                                    <i className="fas fa-copy"></i> Copiar
                                </button>
                            </div>
                            <div className="d-flex justify-content-center gap-2 mt-3">
                                <a 
                                    href={`https://wa.me/?text=Confira nossos produtos em estoque: ${encodeURIComponent(publicLink)}`}
                                    className="btn btn-success" 
                                    target="_blank"
                                >
                                    <i className="fab fa-whatsapp"></i> WhatsApp
                                </a>
                                <a 
                                    href={`mailto:?subject=Produtos em Estoque - ${encodeURIComponent(companyName)}&body=Confira nossos produtos em estoque: ${encodeURIComponent(publicLink)}`}
                                    className="btn btn-primary" 
                                    target="_blank"
                                >
                                    <i className="fas fa-envelope"></i> Email
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-fluid py-4 mt-5">
                <Dashboard />
            </div>
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

// Função para copiar texto para a área de transferência
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Erro ao copiar:', err);
        return false;
    }
}

// SaleReceiptModal component para exibir o comprovante de venda
const SaleReceiptModal = ({ show, onHide, sale }) => {
    if (!sale) return null;

    const formatPaymentMethod = (method) => {
        switch (method) {
            case 'dinheiro': return 'Dinheiro';
            case 'cartao_credito': return 'Cartão de Crédito';
            case 'cartao_debito': return 'Cartão de Débito';
            case 'pix': return 'PIX';
            case 'crediario': return 'Crediário';
            default: return method;
        }
    };

    const printReceipt = () => {
        const printWindow = window.open('', '_blank');
        const userData = JSON.parse(localStorage.getItem('userData')) || {};
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Comprovante de Venda #${sale.id}</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            width: 300px;
                            margin: 0 auto;
                            padding: 10px;
                            font-size: 12px;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .divider {
                            border-top: 1px dashed #000;
                            margin: 10px 0;
                        }
                        .item {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 5px;
                        }
                        .total {
                            font-weight: bold;
                            margin-top: 10px;
                            text-align: right;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            font-size: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>${userData.company || 'Nome da Empresa'}</h2>
                        <p>CNPJ: XX.XXX.XXX/0001-XX</p>
                        <p>Comprovante de Venda #${sale.id}</p>
                        <p>${new Date(sale.createdAt).toLocaleString()}</p>
                    </div>
                    
                    <div class="divider"></div>
                    
                    ${sale.client ? `
                    <div>
                        <p><strong>Cliente:</strong> ${sale.client.name}</p>
                        ${sale.client.document ? `<p><strong>CPF/CNPJ:</strong> ${sale.client.document}</p>` : ''}
                    </div>
                    <div class="divider"></div>
                    ` : ''}
                    
                    <div>
                        <p><strong>ITENS</strong></p>
                        ${sale.items.map(item => `
                            <div class="item">
                                <span>${item.quantity}x ${item.product.name}</span>
                                <span>R$ ${parseFloat(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <div style="margin-left: 15px; font-size: 10px;">
                                R$ ${parseFloat(item.price).toFixed(2)} un.
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div>
                        <div class="item">
                            <span>Subtotal:</span>
                            <span>R$ ${sale.items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0).toFixed(2)}</span>
                        </div>
                        ${parseFloat(sale.discount) > 0 ? `
                        <div class="item">
                            <span>Desconto:</span>
                            <span>R$ ${parseFloat(sale.discount).toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div class="item total">
                            <span>TOTAL:</span>
                            <span>R$ ${parseFloat(sale.total).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div>
                        <p><strong>Pagamento:</strong> ${formatPaymentMethod(sale.paymentMethod)}</p>
                    </div>
                    
                    <div class="footer">
                        <p>Obrigado pela preferência!</p>
                        <p>Este documento não possui valor fiscal</p>
                    </div>
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        setTimeout(function() { printWindow.close(); }, 500);
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Comprovante de Venda #{sale.id}</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <div className="text-center mb-3">
                            <h5>{JSON.parse(localStorage.getItem('userData') || '{}').company || 'Nome da Empresa'}</h5>
                        </div>
                        
                        <div className="d-flex justify-content-between mb-3">
                            <h6>Data/Hora:</h6>
                            <span>{new Date(sale.createdAt).toLocaleString()}</span>
                        </div>
                        
                        {sale.client && (
                            <div className="mb-3">
                                <h6>Cliente:</h6>
                                <p className="mb-0">{sale.client.name}</p>
                                {sale.client.document && <small className="text-muted">CPF/CNPJ: {sale.client.document}</small>}
                            </div>
                        )}
                        
                        <h6>Produtos:</h6>
                        <div className="table-responsive mb-3">
                            <table className="table table-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>Produto</th>
                                        <th className="text-center">Preço</th>
                                        <th className="text-center">Qtde</th>
                                        <th className="text-end">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sale.items.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.product.name}</td>
                                            <td className="text-center">R$ {parseFloat(item.price).toFixed(2)}</td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-end">R$ {parseFloat(item.price * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="d-flex justify-content-between mb-1">
                            <h6>Subtotal:</h6>
                            <span>R$ {sale.items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0).toFixed(2)}</span>
                        </div>
                        
                        {parseFloat(sale.discount) > 0 && (
                            <div className="d-flex justify-content-between mb-1">
                                <h6>Desconto:</h6>
                                <span>R$ {parseFloat(sale.discount).toFixed(2)}</span>
                            </div>
                        )}
                        
                        <div className="d-flex justify-content-between mb-3">
                            <h5 className="fw-bold">Total:</h5>
                            <h5 className="fw-bold">R$ {parseFloat(sale.total).toFixed(2)}</h5>
                        </div>
                        
                        <div className="d-flex justify-content-between mb-1">
                            <h6>Forma de Pagamento:</h6>
                            <span>{formatPaymentMethod(sale.paymentMethod)}</span>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onHide}>Fechar</button>
                        <button type="button" className="btn btn-primary" onClick={printReceipt}>
                            <i className="fas fa-print me-2"></i>
                            Imprimir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}; 

// Cliente Modal Component
const ClientModal = ({ show, onHide, client, onSubmit }) => {
    const [formData, setFormData] = useState(
        client 
        ? { ...client } 
        : { name: '', email: '', phone: '', document: '' }
    );

    useEffect(() => {
        if (client) {
            setFormData({ ...client });
        } else {
            setFormData({ name: '', email: '', phone: '', document: '' });
        }
    }, [client]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        onHide();
    };

    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{client ? 'Editar Cliente' : 'Novo Cliente'}</h5>
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
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Telefone</label>
                                <input
                                    type="tel"
                                    className="form-control"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">CPF/CNPJ</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.document}
                                    onChange={(e) => setFormData({...formData, document: e.target.value})}
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

// Componente ClientOptionsModal
const ClientOptionsModal = ({ show, onHide, onNewClient, onListClients }) => {
    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Gerenciar Clientes</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <div className="d-grid gap-3">
                            <button className="btn btn-primary py-3" onClick={onNewClient}>
                                <i className="fas fa-user-plus fa-2x mb-2 d-block mx-auto"></i>
                                <span className="d-block">Cadastrar Novo Cliente</span>
                            </button>
                            
                            <button className="btn btn-info py-3" onClick={onListClients}>
                                <i className="fas fa-users fa-2x mb-2 d-block mx-auto"></i>
                                <span className="d-block">Listar / Gerenciar Clientes</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente ClientsListModal
const ClientsListModal = ({ show, onHide, clients, onEdit, onDelete, onView }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (client.document && client.document.includes(searchTerm)) ||
        (client.phone && client.phone.includes(searchTerm))
    );
    
    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Gerenciar Clientes</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <div className="mb-3">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="fas fa-search"></i>
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control"
                                    placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>Nome</th>
                                        <th>Contato</th>
                                        <th>CPF/CNPJ</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClients.map(client => (
                                        <tr key={client.id}>
                                            <td>{client.name}</td>
                                            <td>
                                                <div>{client.email}</div>
                                                <small className="text-muted">{client.phone}</small>
                                            </td>
                                            <td>{client.document}</td>
                                            <td>
                                                <div className="btn-group">
                                                    <button 
                                                        className="btn btn-sm btn-info" 
                                                        onClick={() => onView(client)}
                                                        title="Visualizar"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-primary" 
                                                        onClick={() => onEdit(client)}
                                                        title="Editar"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-danger" 
                                                        onClick={() => onDelete(client.id)}
                                                        title="Excluir"
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
                        
                        {filteredClients.length === 0 && (
                            <div className="text-center py-4">
                                <i className="fas fa-users fa-3x text-muted mb-3"></i>
                                <p className="text-muted">Nenhum cliente encontrado</p>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onHide}>Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente para visualizar detalhes do cliente
const ClientDetailsModal = ({ show, onHide, client }) => {
    if (!client) return null;
    
    return (
        <div className={`modal ${show ? 'show' : ''}`} style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Detalhes do Cliente</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <div className="card mb-0">
                            <div className="card-body">
                                <h5 className="card-title mb-3">{client.name}</h5>
                                
                                <div className="mb-3">
                                    <strong>Email:</strong>
                                    <p>{client.email || 'Não informado'}</p>
                                </div>
                                
                                <div className="mb-3">
                                    <strong>Telefone:</strong>
                                    <p>{client.phone || 'Não informado'}</p>
                                </div>
                                
                                <div className="mb-3">
                                    <strong>CPF/CNPJ:</strong>
                                    <p>{client.document || 'Não informado'}</p>
                                </div>
                                
                                <div className="mb-0">
                                    <strong>Data de Cadastro:</strong>
                                    <p>{new Date(client.createdAt).toLocaleDateString()}</p>
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