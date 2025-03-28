// Product Search Page Component
const ProductSearch = () => {
    const { token } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (token) {
            fetchCategories();
        }
    }, [token]);

    const fetchCategories = async () => {
        try {
            const categoriesRes = await axios.get('/categories');
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            if (error.response && error.response.status === 401) {
                logout();
            }
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        setError(null);
        setHasSearched(true);
        try {
            const productsRes = await axios.get('/products');
            setProducts(productsRes.data);
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            if (error.response && error.response.status === 401) {
                logout();
            } else {
                setError('Erro ao buscar produtos. Por favor, tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await axios.delete(`/products/${id}`);
                handleSearch(); // Atualiza a lista após deletar
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
            }
        }
    };

    const filteredProducts = products
        .filter(product => 
            (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (!selectedCategory || product.category === selectedCategory)
        )
        .sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'price':
                    comparison = a.price - b.price;
                    break;
                case 'quantity':
                    comparison = a.quantity - b.quantity;
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    if (loading) {
        return (
            <div className="text-center p-5">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 mb-0">Busca de Produtos</h1>
                <a 
                    href="/"
                    className="btn btn-primary"
                >
                    <i className="fas fa-arrow-left me-2"></i>
                    Voltar
                </a>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="row g-3">
                        <div className="col-md-4">
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
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleSearch}
                                >
                                    Buscar
                                </button>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <select 
                                className="form-select"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">Todas as categorias</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.name}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select 
                                className="form-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="name">Ordenar por Nome</option>
                                <option value="price">Ordenar por Preço</option>
                                <option value="quantity">Ordenar por Quantidade</option>
                                <option value="category">Ordenar por Categoria</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <button 
                                className="btn btn-outline-secondary w-100"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                                <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                                {' '}
                                {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body p-0">
                    <div className="product-list">
                        {error && (
                            <div className="alert alert-danger m-3">
                                {error}
                            </div>
                        )}
                        
                        {!hasSearched && (
                            <div className="text-center p-5">
                                <i className="fas fa-search fa-3x text-muted mb-3 d-block"></i>
                                <p className="text-muted">Digite sua busca e clique em Buscar para encontrar produtos</p>
                            </div>
                        )}

                        {hasSearched && filteredProducts.map(product => (
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
                                            {product.description && (
                                                <div className="mt-2">
                                                    <strong>Descrição:</strong>
                                                    <p className="mb-0 text-muted">{product.description}</p>
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
                        {hasSearched && filteredProducts.length === 0 && (
                            <div className="text-center p-4">
                                <i className="fas fa-search fa-3x text-muted mb-3 d-block"></i>
                                <p className="text-muted">Nenhum produto encontrado com os filtros selecionados</p>
                            </div>
                        )}
                    </div>
                </div>
                {hasSearched && (
                    <div className="card-footer">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">
                                Total encontrado: <strong>{filteredProducts.length}</strong> produtos
                            </span>
                            <div className="badge bg-primary">
                                {selectedCategory ? `Categoria: ${selectedCategory}` : 'Todas as categorias'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}; 