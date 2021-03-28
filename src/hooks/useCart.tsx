import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);

      const stock = await api.get<Stock>(`/stock/${productId}`);
      
      const stockAmount = stock.data.amount;

      if (Number(productExists?.amount) >= stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      const product = await api.get<Product>(`/products/${productId}`)

      const productData = product.data;

      if(productExists) {
        const requestCart = cart.map((item) => {
          if(item.id === productId) {
            return { ...item, amount: item.amount + 1 };
          }
          return item;
        });
        setCart(requestCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(requestCart));
      } else {
        const requestCart = [...cart, { ...productData, amount: 1 }];
        
        setCart(requestCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(requestCart));
      }
        
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedProduct = [...cart];
      const productIndex = updatedProduct.findIndex(product => product.id === productId);

      if(productIndex >= 0) {
        updatedProduct.splice(productIndex, 1);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProduct));
        setCart(updatedProduct);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stock = await api.get<Stock>(`/stock/${productId}`);
      
      const stockAmount = stock.data.amount;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const updatedProduct = [...cart];
      const productExists = updatedProduct.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;

        setCart(updatedProduct);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProduct));
      }  else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
